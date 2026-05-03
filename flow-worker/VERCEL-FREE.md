# Deploy LandscapeApp lên Vercel — FREE (không VPS, không trả phí)

> ✅ **Verified 2026-05-03** — tunnel test pass, end-to-end works.

## Kiến trúc

```
┌──────────────────────────┐
│ Vercel: LandscapeApp     │   pure HTTP, deploy bình thường
│ env: FLOW_WORKER_URL=... │
└────────────┬─────────────┘
             │ HTTPS POST /gen-image, /gen-video
             ▼
┌──────────────────────────┐
│ Cloudflare Tunnel (free) │   tự cấp HTTPS public URL
│ trycloudflare.com/...    │
└────────────┬─────────────┘
             │ tunnel localhost:3001
             ▼
┌──────────────────────────┐
│ Mac của anh (localhost)  │
│ flow-worker + Chrome     │   captcha resolve ở đây
│ (đã đăng nhập Flow sẵn)  │
└──────────────────────────┘
```

## Setup (1 lần)

### Bước 1 — Cài cloudflared (nếu chưa có)
```bash
brew install cloudflared
```

### Bước 2 — Đảm bảo Flow đã đăng nhập trên Mac
```bash
cd LandscapeApp/server
node test_login.js
# → Mở Chrome, đăng nhập Google → cookies persist trong tooltaoanh/flow_profile/
```

## Chạy hằng ngày

### Trên Mac của anh
```bash
cd flow-worker
./start-tunnel.sh
```

Output sẽ in ra (sau ~20s):
```
═══════════════════════════════════════════════════════════════
[3/3] ✅ READY — Paste config sau vào Vercel project env vars:
═══════════════════════════════════════════════════════════════

    FLOW_WORKER_URL    = https://random-name.trycloudflare.com
    FLOW_WORKER_SECRET = abc123...

═══════════════════════════════════════════════════════════════
```

### Trên Vercel dashboard

1. Mở project LandscapeApp
2. Settings → Environment Variables
3. Thêm 2 biến:
   - `FLOW_WORKER_URL` = (URL từ output trên)
   - `FLOW_WORKER_SECRET` = (secret từ output trên)
4. Save → Redeploy (hoặc đợi auto deploy)

### Verify hoạt động
```bash
# Trên Mac (terminal khác, không tắt tunnel)
curl https://random-name.trycloudflare.com/health
# → {"ok":true,"service":"flow-worker",...}

# Trên Vercel: gọi 1 endpoint gen
curl -X POST https://your-app.vercel.app/api/projects/xxx/chatgpt-generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"...","assets":[]}'
```

## Lưu ý quan trọng

### URL tunnel KHÔNG cố định
Mỗi lần restart `start-tunnel.sh`, URL sẽ đổi. Anh phải:
- Để tunnel chạy 24/7 (không Ctrl+C)
- Hoặc update Vercel env mỗi lần URL đổi

**Workaround**: dùng **Cloudflare Tunnel cố định** (cũng free):
1. Đăng ký domain ở Cloudflare (hoặc dùng subdomain)
2. `cloudflared tunnel login`
3. `cloudflared tunnel create flow-worker`
4. Tạo file `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: <tunnel-id>
   credentials-file: /Users/bephi/.cloudflared/<tunnel-id>.json
   ingress:
     - hostname: flow-worker.example.com
       service: http://localhost:3001
     - service: http_status:404
   ```
5. `cloudflared tunnel route dns flow-worker flow-worker.example.com`
6. `cloudflared tunnel run flow-worker`
7. Vercel env: `FLOW_WORKER_URL=https://flow-worker.example.com` (cố định)

### Mac phải bật khi dùng service
- Nếu Mac sleep → tunnel die → request fail
- Bật **Settings → Battery → Prevent automatic sleeping**
- Hoặc dùng `caffeinate -di ./start-tunnel.sh` để giữ Mac thức

### Restart khi mạng đổi
Cloudflared tự reconnect khi mạng đổi (WiFi → 4G), không cần restart.

### Verify worker đang sống từ Vercel
Vercel function timeout: 10s (Hobby) / 60s (Pro). Health check cần fast:
```javascript
// pages/api/health.js (Vercel)
export default async function handler(req, res) {
  try {
    const r = await fetch(`${process.env.FLOW_WORKER_URL}/health`, { signal: AbortSignal.timeout(5000) });
    const j = await r.json();
    res.json({ vercel: 'ok', worker: j });
  } catch (e) {
    res.status(503).json({ vercel: 'ok', worker: 'unreachable', error: e.message });
  }
}
```

## Cost breakdown

| Item | Cost |
|---|---|
| Vercel Hobby plan | Free |
| Cloudflare Tunnel | Free forever |
| Mac của anh | $0 (đã có) |
| Internet | $0 marginal |
| **Total** | **$0/tháng** |

## Khi nào KHÔNG đủ

Path này phù hợp:
- ✅ Personal/dev project
- ✅ Volume thấp (~< 100 gen/ngày)
- ✅ User ít, tolerable nếu Mac sleep

KHÔNG phù hợp:
- ❌ Production thương mại 24/7
- ❌ Volume cao (Mac không scale)
- ❌ User mong đợi 99.9% uptime

→ Khi cần → migrate sang Hetzner VPS €4 hoặc Fly.io ~$5.

## Troubleshooting

**Tunnel URL trả 502 Bad Gateway**
→ Worker chết hoặc không listen port 3001. Check `tail -f /tmp/flow-worker-logs/worker.log`.

**Tunnel URL trả timeout**
→ Mac sleeping. `caffeinate -di ./start-tunnel.sh` để giữ thức.

**Vercel function timeout 10s**
→ Hobby plan limit. Image gen 30-50s, video gen 50s+. Phải Pro plan ($20/tháng) cho 60s timeout, hoặc gen async (return jobId, poll status).

**Cookie hết hạn (`Flow session chưa đăng nhập`)**
→ Re-login: `node LandscapeApp/server/test_login.js` trên Mac → restart tunnel.
