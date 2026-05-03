#!/usr/bin/env bash
# Start Xvfb on :99 then launch Node server. Browser inside flowAutomation
# connects to DISPLAY=:99 → Chrome runs in virtual display, no real monitor needed.

set -e

# Start Xvfb in background
Xvfb :99 -screen 0 1440x900x24 -nolisten tcp &
XVFB_PID=$!
echo "[entrypoint] Xvfb started (pid=$XVFB_PID, DISPLAY=:99)"

# Trap signals to shut down cleanly
shutdown() {
  echo "[entrypoint] shutting down..."
  kill -TERM $NODE_PID 2>/dev/null || true
  kill -TERM $XVFB_PID 2>/dev/null || true
  wait
}
trap shutdown SIGTERM SIGINT

# Launch Node server (foreground)
node /app/server.js &
NODE_PID=$!

wait $NODE_PID
