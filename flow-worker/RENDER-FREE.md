# Deploy flow-worker lên Render Free — full guide

> **⚠️ Lưu ý quan trọng**: Render Free 512MB RAM **borderline OOM** với Chrome. Có thể gen 1 ảnh thành công, nhưng burst 2-3 ảnh có thể crash. Test để biết.

## Why Render?

| | Mac + Tunnel | Render Free | VPS Hetzner |
|---|---|---|---|
| Cost | $0 | $0 | €4 |
| Mac on/off | ✅ Mac phải bật | ✅ Tự động 24/7 | ✅ Tự động 24/7 |
| RAM | Bao nhiêu cũng được | ⚠️ 512MB tight | ✅ 4GB |
| Spin down | N/A | ⚠️ 15min idle | ✅ Không |
| Cookie persist | ✅ profile dir | ❌ env var (refresh manually) | ✅ disk |
| URL cố định | ⚠️ tunnel đổi | ✅ onrender.com | ✅ tự setup |

**Render free tốt nếu**: anh không muốn để Mac bật, traffic thấp, tolerate occasional restart.
**Render free tệ nếu**: muốn 24/7 reliable, gen burst, video gen dài (50+ giây).

## Đã verify hoạt động

- ✅ Storage state extraction (Mac → 4.1KB gzip+base64)
- ✅ flowAutomation.js storageState mode (image gen 46.4s, video gen tested)
- ✅ Cookies portable Mac → Linux (test trên Mac headless launch + storageState)

## Chưa verify (anh làm)

- ❓ Chrome chạy trong 512MB Render Free RAM
- ❓ Cold start time sau spin down
- ❓ Cookie expire frequency

## Setup deploy

### Bước 1 — Trên Mac
```bash
cd /Users/bephi/webve/designer/flow-worker
./prepare-render.sh
```

Output:
- `flow-worker/flowAutomation.js` (copy mới nhất)
- `/tmp/render-env.txt` (env var để paste)

### Bước 2 — Push code lên GitHub
```bash
cd /Users/bephi/webve/designer
git add flow-worker/
git commit -m "Add flow-worker for Render deploy"
git push
```

### Bước 3 — Render dashboard

1. Đăng nhập [render.com](https://render.com)
2. **New** → **Blueprint**
3. Connect GitHub repo (chứa folder `flow-worker/`)
4. Render đọc `flow-worker/render.yaml` tự động → propose service `flow-worker`
5. Click **Apply**

### Bước 4 — Add env var

Render dashboard → Service `flow-worker` → **Environment**:

- `FLOW_STATE_B64` — paste nội dung `/tmp/render-env.txt`:
  ```bash
  pbcopy < /tmp/render-env.txt
  ```
  Paste vào field giá trị, click **Save Changes**

Render sẽ tự redeploy với env mới (~3-5 phút).

### Bước 5 — Test sau deploy

```bash
# Liveness
curl https://flow-worker.onrender.com/health

# Image gen (cần WORKER_SECRET — lấy ở Render dashboard → Environment)
curl -X POST https://flow-worker.onrender.com/gen-image \
  -H "Content-Type: application/json" \
  -H "X-Worker-Auth: $WORKER_SECRET" \
  -d '{"prompt":"A serene mountain valley","assets":[],"flowConfig":{"variantCount":1,"aspectRatio":"16:9"}}'
```

### Bước 6 — Vercel env

Vercel dashboard → LandscapeApp project → **Settings** → **Environment Variables**:
- `FLOW_WORKER_URL` = `https://flow-worker.onrender.com`
- `FLOW_WORKER_SECRET` = (lấy từ Render `flow-worker` → Environment → `WORKER_SECRET`)

Save → Vercel redeploy.

## Maintain

### Khi cookies hết hạn (~1-7 ngày)

Anh sẽ thấy gen fail với `Flow session chưa đăng nhập`. Cách fix:

```bash
# Trên Mac
cd /Users/bephi/webve/designer/LandscapeApp/server
node test_login.js  # re-login

cd ../../flow-worker
node export-state.js > /tmp/render-env.txt
pbcopy < /tmp/render-env.txt
```

Render dashboard → Environment → Update `FLOW_STATE_B64` → Save → auto-redeploy.

### Khi spin down

Render free spin down sau 15 phút idle. First request sau đó cold start ~30-60s. Cách work-around:
- Setup [cron-job.org](https://cron-job.org) ping `/health` mỗi 14 phút (free)
- Hoặc Vercel Cron Job (Pro plan) ping mỗi 14 phút

## Troubleshooting

### Build fail trên Render
- Check build log: Chrome download có thể fail nếu Render network glitch → manual retry deploy
- Nếu Dockerfile parse fail → check `flow-worker/flowAutomation.js` đã commit chưa (cần file này local trong build context)

### Worker boot OK nhưng /health 503
- Xvfb không start (RAM full ngay từ đầu) → khó fix trên 512MB
- Fall back: Render Starter $7 (cũng 512MB nhưng có persistent disk + ít noisy neighbor hơn)

### Gen fail "reCAPTCHA evaluation failed"
- Cookies hết hạn → re-export state (xem trên)
- Hoặc Render IP bị Google flag (Render IPs cũng là datacenter, đôi khi blacklist)
  → Worst case fallback: dùng Cloudflare Tunnel + Mac (file `VERCEL-FREE.md`)

### Out of memory (OOM)
Container restart liên tục:
```
[BROWSER] Khởi tạo browser từ FLOW_STATE_B64 storageState...
<exit 137>
```
Exit 137 = OOM kill. Render free RAM 512MB không đủ.
- Reduce `FLOW_CONCURRENCY=1` (đã là 1)
- Try Render Starter $7 (cũng 512MB nhưng dedicated)
- Hoặc fallback Cloudflare Tunnel + Mac

## Final fallback

Nếu Render free thực sự không stable, đi back về:
- **Cloudflare Tunnel + Mac** (file `VERCEL-FREE.md`) — $0, Mac phải bật
- **Hetzner CX22** (file `README.md`) — €4, 24/7 stable
