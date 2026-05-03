#!/usr/bin/env bash
# start-tunnel.sh
# Khởi động flow-worker + Cloudflare Tunnel, in ra HTTPS URL để paste vào Vercel.
#
# Cách dùng:
#   chmod +x start-tunnel.sh
#   ./start-tunnel.sh
#
# Cần cài trước (1 lần):
#   brew install cloudflared       # macOS
#   apt install cloudflared        # Ubuntu/Debian
#
# Worker phải chạy ngon trên Mac này — anh đã verify image gen + video gen làm được.
# Tunnel chỉ là cầu nối HTTPS public để Vercel gọi tới.

set -e

cd "$(dirname "$0")"

PORT="${PORT:-3001}"
WORKER_SECRET="${WORKER_SECRET:-$(openssl rand -hex 16)}"
LOG_DIR="${LOG_DIR:-/tmp/flow-worker-logs}"
mkdir -p "$LOG_DIR"

WORKER_LOG="$LOG_DIR/worker.log"
TUNNEL_LOG="$LOG_DIR/tunnel.log"

# Check cloudflared
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "❌ cloudflared chưa cài. Chạy: brew install cloudflared"
  exit 1
fi

# Trap to clean up on Ctrl+C
cleanup() {
  echo ""
  echo "[stop] Đang dừng worker và tunnel..."
  kill $WORKER_PID 2>/dev/null || true
  kill $TUNNEL_PID 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# Start flow-worker
echo "[1/3] 🚀 Khởi động flow-worker trên port $PORT..."
WORKER_SECRET="$WORKER_SECRET" PORT="$PORT" node server.js > "$WORKER_LOG" 2>&1 &
WORKER_PID=$!
sleep 3

# Verify worker is up
if ! curl -sf "http://localhost:$PORT/health" > /dev/null; then
  echo "❌ flow-worker không khởi động được. Check log: $WORKER_LOG"
  tail -20 "$WORKER_LOG"
  exit 1
fi
echo "    ✓ Worker chạy (PID $WORKER_PID, log: $WORKER_LOG)"

# Start Cloudflare Tunnel
echo "[2/3] 🌐 Khởi động Cloudflare Tunnel..."
cloudflared tunnel --url "http://localhost:$PORT" --no-autoupdate > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

# Wait for tunnel URL to appear
echo "    Đang chờ tunnel URL (15-20s)..."
TUNNEL_URL=""
for i in {1..30}; do
  sleep 1
  TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -1 || true)
  if [ -n "$TUNNEL_URL" ]; then break; fi
done

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Tunnel không lấy được URL. Check log: $TUNNEL_LOG"
  tail -20 "$TUNNEL_LOG"
  cleanup
fi

echo "    ✓ Tunnel URL: $TUNNEL_URL"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "[3/3] ✅ READY — Paste config sau vào Vercel project env vars:"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "    FLOW_WORKER_URL    = $TUNNEL_URL"
echo "    FLOW_WORKER_SECRET = $WORKER_SECRET"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Test thử từ terminal khác:"
echo "    curl -X POST $TUNNEL_URL/health"
echo ""
echo "Logs:"
echo "    Worker: tail -f $WORKER_LOG"
echo "    Tunnel: tail -f $TUNNEL_LOG"
echo ""
echo "Ctrl+C để dừng cả 2."
echo ""

# Keep alive — wait for either to die
wait
