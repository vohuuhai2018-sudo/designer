#!/usr/bin/env bash
# Chạy trên máy mới để check setup. Báo CÁI THIẾU → biết phải làm gì.
# Usage: bash scripts/diagnose-machine.sh

set +e
cd "$(dirname "$0")/.." || exit 1
ROOT=$(pwd)
APP="$ROOT/LandscapeApp"

echo "=========================================="
echo "DIAGNOSTIC: $(hostname) — $(date)"
echo "Root: $ROOT"
echo "=========================================="
echo ""

# 1. Git state
echo "[1/8] Git state..."
git rev-parse --short HEAD 2>/dev/null && \
  echo "  Branch: $(git rev-parse --abbrev-ref HEAD)" || \
  echo "  ❌ Không phải git repo"
echo ""

# 2. .env (FE root + BE server có thể có riêng)
echo "[2/8] .env files..."
for envpath in "$APP/.env" "$APP/server/.env"; do
  if [ -f "$envpath" ]; then
    echo "  ✓ Có $envpath"
    echo "    Keys: $(grep -E '^[A-Z_]+=' "$envpath" | cut -d= -f1 | tr '\n' ' ')"
  else
    echo "  ⚠ Không có $envpath"
  fi
done
echo ""

# 3. node_modules (FE root + BE server có node_modules riêng)
echo "[3/8] node_modules..."
[ -d "$APP/node_modules" ]        && echo "  ✓ FE: $APP/node_modules" || echo "  ❌ FE: cần 'cd LandscapeApp && npm install'"
[ -d "$APP/server/node_modules" ] && echo "  ✓ BE: $APP/server/node_modules" || echo "  ❌ BE: cần 'cd LandscapeApp/server && npm install'"
echo ""

# 4. Playwright + chromium
echo "[4/8] Playwright + chromium..."
if [ -d "$APP/server/node_modules/playwright-core" ]; then
  echo "  ✓ Có playwright-core (BE)"
elif [ -d "$APP/node_modules/playwright-core" ]; then
  echo "  ✓ Có playwright-core (FE root)"
else
  echo "  ❌ Chưa cài playwright-core"
fi

CHROME_PATHS=(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
  "/usr/bin/google-chrome"
  "/usr/bin/google-chrome-stable"
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
)
FOUND_CHROME=""
for p in "${CHROME_PATHS[@]}"; do
  [ -f "$p" ] && FOUND_CHROME="$p" && break
done
if [ -n "$FOUND_CHROME" ]; then
  echo "  ✓ Chrome: $FOUND_CHROME"
else
  echo "  ❌ Không thấy Chrome — install hoặc set CHROME_EXECUTABLE_PATH"
fi
echo ""

# 5. Flow profile
echo "[5/8] Flow profile (login Google)..."
PROFILE="$ROOT/tooltaoanh/flow_profile"
if [ -d "$PROFILE/Default" ] && [ -f "$PROFILE/Default/Cookies" ]; then
  COOKIE_SIZE=$(stat -f%z "$PROFILE/Default/Cookies" 2>/dev/null || stat -c%s "$PROFILE/Default/Cookies" 2>/dev/null)
  echo "  ✓ Profile có Cookies file ($COOKIE_SIZE bytes)"
else
  echo "  ❌ THIẾU profile login — chạy: node LandscapeApp/server/test_login.js"
fi
echo ""

# 6. MongoDB URI (BE đọc từ server/.env; có thể fallback root .env)
echo "[6/8] MongoDB URI..."
MONGO_URI=""
for envpath in "$APP/server/.env" "$APP/.env"; do
  if [ -f "$envpath" ]; then
    URI=$(grep -E '^(MONGODB_URI|MONGO_URI|DATABASE_URL)=' "$envpath" | head -1 | cut -d= -f2-)
    if [ -n "$URI" ]; then
      MONGO_URI="$URI"
      # Mask password trong URI mongodb://user:PASS@host/...
      MASKED=$(echo "$URI" | sed -E 's|(mongodb(\+srv)?://[^:]+:)[^@]+(@.*)|\1***\3|')
      echo "  ✓ Tìm thấy trong $envpath: $MASKED"
      break
    fi
  fi
done
[ -z "$MONGO_URI" ] && echo "  ❌ Chưa có MONGODB_URI trong .env nào"
echo ""

# 7. Port 5000/5173 free
echo "[7/8] Ports..."
if command -v lsof >/dev/null; then
  for port in 5000 5173; do
    BUSY=$(lsof -i:$port -P -t 2>/dev/null | head -1)
    if [ -z "$BUSY" ]; then
      echo "  ✓ Port $port free"
    else
      echo "  ⚠ Port $port đang bận (PID $BUSY)"
    fi
  done
else
  echo "  ⚠ lsof không có (Windows?) — skip port check"
fi
echo ""

# 8. Test Flow login state (cần dev server chạy)
echo "[8/8] Quick Flow auth test..."
echo "  → Để verify login: chạy 'node LandscapeApp/server/test_login.js'"
echo "    Nếu in '✅ access_token OK — user: xxx' = login OK"
echo "    Nếu mở Chrome popup yêu cầu login = chưa login"
echo ""

echo "=========================================="
echo "DONE. Nếu có ❌ → fix cái đó trước khi chạy npm run dev."
echo "=========================================="
