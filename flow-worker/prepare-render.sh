#!/usr/bin/env bash
# Chuẩn bị artifacts cho Render deploy:
#   1. Copy flowAutomation.js (Render Docker build cần file này)
#   2. Run export-state.js → in ra FLOW_STATE_B64 env var
#
# Sau khi script này chạy xong:
#   - git add flow-worker/flowAutomation.js && git commit && git push
#   - Render dashboard → Connect repo → Auto-deploy
#   - Paste FLOW_STATE_B64 vào Render env vars
set -e
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"

echo "[prepare-render] 1/2 — Copy flowAutomation.js..."
cp "$ROOT/LandscapeApp/server/flowAutomation.js" ./flowAutomation.js
LINES=$(wc -l < ./flowAutomation.js)
echo "    ✓ flowAutomation.js: $LINES dòng"

echo "[prepare-render] 2/2 — Extract storageState..."
node export-state.js > /tmp/render-env.txt 2>/tmp/render-export.log
EXPORT_RC=$?

if [ $EXPORT_RC -ne 0 ]; then
  echo "❌ export-state.js fail. Log:"
  cat /tmp/render-export.log
  exit 1
fi

cat /tmp/render-export.log
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ READY — files đã prepare:"
echo "   flow-worker/flowAutomation.js (committed cùng worker)"
echo "   /tmp/render-env.txt (env vars để paste vào Render)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Bước tiếp:"
echo ""
echo "1. Commit + push:"
echo "   git add flow-worker/"
echo "   git commit -m 'Add flow-worker for Render'"
echo "   git push"
echo ""
echo "2. Render dashboard:"
echo "   - New → Blueprint → Connect GitHub repo"
echo "   - Render đọc render.yaml → tự build Docker"
echo ""
echo "3. Paste env (manual trong dashboard → Environment):"
echo "   FLOW_STATE_B64 = (copy từ /tmp/render-env.txt)"
echo ""
echo "   Quick paste lệnh:"
echo "   pbcopy < /tmp/render-env.txt   # macOS"
echo ""
echo "4. Sau deploy xong (~3-5 phút), test:"
echo "   curl https://flow-worker.onrender.com/health"
echo ""
echo "5. Set Vercel env:"
echo "   FLOW_WORKER_URL    = https://flow-worker.onrender.com"
echo "   FLOW_WORKER_SECRET = (lấy từ Render dashboard, đã auto-gen)"
echo ""
