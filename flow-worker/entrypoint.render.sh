#!/usr/bin/env bash
# Render entrypoint — start Xvfb + Node server. Cookies come from FLOW_STATE_B64
# env var (no filesystem persistence needed).
set -e

# Sanity check FLOW_STATE_B64
if [ -z "$FLOW_STATE_B64" ] && [ -z "$FLOW_STATE_B64_1" ]; then
  echo "[entrypoint] ⚠️  FLOW_STATE_B64 chưa set!"
  echo "[entrypoint] Trên Mac chạy: cd flow-worker && node export-state.js"
  echo "[entrypoint] → copy output vào Render env vars."
  echo "[entrypoint] Worker sẽ start nhưng gen sẽ fail."
fi

# Start Xvfb on :99 (1280x800x24 — đủ cho Flow, tiết kiệm RAM)
Xvfb :99 -screen 0 1280x800x24 -nolisten tcp &
XVFB_PID=$!
echo "[entrypoint] Xvfb started (pid=$XVFB_PID, DISPLAY=:99)"

shutdown() {
  echo "[entrypoint] shutting down..."
  kill -TERM $NODE_PID 2>/dev/null || true
  kill -TERM $XVFB_PID 2>/dev/null || true
  wait
}
trap shutdown SIGTERM SIGINT

PORT="${PORT:-10000}" node /app/server.js &
NODE_PID=$!

wait $NODE_PID
