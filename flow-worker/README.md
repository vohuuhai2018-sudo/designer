# flow-worker

Express HTTP service wrapping `flowAutomation.js` so the main app can be pure HTTP (Vercel/Lambda compatible).

## Why this exists

reCAPTCHA Enterprise V3 tokens **cannot be generated server-side** — they require a real Chrome with grecaptcha.js. This service isolates that requirement to **one place**, so the main LandscapeApp can deploy serverless.

## Architecture

```
┌──────────────────────────┐
│ LandscapeApp (Vercel)    │   pure HTTP, no Chrome
│ - Express + Mongo        │
│ - flowAutomation.js with │
│   FLOW_WORKER_URL set    │
└──────────┬───────────────┘
           │ POST /gen-image
           │ POST /gen-video
           │ X-Worker-Auth: <secret>
           ▼
┌──────────────────────────┐
│ flow-worker (1 VPS)      │   Chrome + Xvfb here
│ - Express :3001          │
│ - Wraps flowAutomation   │
│ - p-limit(4) concurrency │
└──────────────────────────┘
```

## Endpoints

### `GET /health`
Liveness check, no auth.
```bash
curl http://worker:3001/health
```

### `POST /gen-image`
```bash
curl -X POST http://worker:3001/gen-image \
  -H "Content-Type: application/json" \
  -H "X-Worker-Auth: $WORKER_SECRET" \
  -d '{
    "prompt": "A serene mountain valley at golden hour",
    "assets": [],
    "flowConfig": { "variantCount": 1, "aspectRatio": "16:9" }
  }'
```
Returns:
```json
{
  "ok": true,
  "elapsedMs": 33000,
  "outputCount": 1,
  "outputs": [{ "base64": "...", "mimeType": "image/png", "sizeBytes": 1040601 }],
  "chatUrl": "https://labs.google/fx/.../project/..."
}
```

### `POST /gen-video`
```bash
curl -X POST http://worker:3001/gen-video \
  -H "Content-Type: application/json" \
  -H "X-Worker-Auth: $WORKER_SECRET" \
  -d '{
    "prompt": "Camera pans slowly across the valley",
    "imageUrl": "https://...",
    "flowConfig": { "aspectRatio": "16:9" }
  }'
```
Returns:
```json
{
  "ok": true,
  "elapsedMs": 51000,
  "videoBase64": "...",
  "mimeType": "video/mp4",
  "sizeBytes": 3500000,
  "chatUrl": "..."
}
```

## Local dev

```bash
# Worker (terminal 1)
cd flow-worker
npm install
node server.js

# Main app pointing to worker (terminal 2)
cd LandscapeApp/server
FLOW_WORKER_URL=http://localhost:3001 node test_api_flow.js single
```

## Production deploy (Hetzner / DigitalOcean / Vultr)

### Option A — Docker (recommended)
```bash
# On VPS
git clone <repo>
cd flow-worker
docker build -t flow-worker .
docker run -d \
  --name flow-worker \
  --restart unless-stopped \
  -p 3001:3001 \
  -e WORKER_SECRET="$(openssl rand -hex 32)" \
  -v /opt/flow-profile:/app/flow-profile \
  -v "$PWD/../LandscapeApp/server/flowAutomation.js:/app/flowAutomation.js:ro" \
  -e FLOW_AUTOMATION_PATH=/app/flowAutomation.js \
  flow-worker
```

### Option B — systemd (no Docker)
```bash
# On VPS
sudo apt install -y xvfb google-chrome-stable nodejs npm
cd /opt && git clone <repo> && cd repo/flow-worker
npm install --omit=dev
sudo cp flow-worker.service /etc/systemd/system/
sudo systemctl enable --now flow-worker
```

`/etc/systemd/system/flow-worker.service`:
```ini
[Unit]
Description=Flow Worker
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/repo/flow-worker
Environment=DISPLAY=:99
Environment=WORKER_SECRET=...
Environment=FLOW_AUTOMATION_PATH=/opt/repo/LandscapeApp/server/flowAutomation.js
ExecStartPre=/usr/bin/Xvfb :99 -screen 0 1440x900x24 &
ExecStart=/usr/bin/node /opt/repo/flow-worker/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Initial Flow login (1 lần)
The persistent profile needs OAuth cookies. On first deploy:
1. SSH X11 forwarding: `ssh -X user@vps`
2. Run `node /opt/repo/LandscapeApp/server/test_login.js` → opens Chrome → login
3. Cookies persist in `/opt/flow-profile/`
4. Re-login khi cookie expire (~1-7 ngày)

## Main app integration

Set 2 env vars on Vercel:
```
FLOW_WORKER_URL=https://worker.example.com:3001
FLOW_WORKER_SECRET=<same as WORKER_SECRET on VPS>
```

That's it — `runFlowAutomation` and `runFlowVideoAutomation` automatically proxy when `FLOW_WORKER_URL` is set. No code changes needed in callers.

## Concurrency

Worker has `p-limit(FLOW_CONCURRENCY=4)` — max 4 simultaneous gen calls. Excess requests queue. Tune via env:
```
FLOW_CONCURRENCY=8  # if VPS has more RAM
```

Recommended: keep ≤4 to avoid reCAPTCHA Enterprise scoring → fail.

## Cost estimate

| Item | Cost |
|---|---|
| Hetzner CX22 (2 vCPU, 4GB) | €4/tháng (~$4) |
| DNS + SSL (Cloudflare) | $0 |
| Vercel Pro (main app) | $20/tháng |
| **Total** | **~$24/tháng** |

vs. running everything on VPS: $4/tháng.
vs. trying to bypass reCAPTCHA: not possible.
