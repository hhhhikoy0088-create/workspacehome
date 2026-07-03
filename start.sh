#!/bin/bash

echo "=== Starting Shrimp Workspace ==="

# Ensure data directories exist
mkdir -p /app/server/outputs/ppt /app/server/uploads /app/data

# Copy bundled db to persistent volume if it doesn't exist yet
if [ -f /app/server/market.db ] && [ ! -f /app/data/market.db ]; then
  echo "[init] Copying bundled database to persistent volume..."
  cp /app/server/market.db /app/data/market.db
fi

# ---- Start Express backend ----
echo "[1/2] Starting Express backend on port ${BACKEND_PORT:-3001}..."
cd /app/server
if [ -x /app/server/node_modules/.bin/tsx ]; then
  TSX=/app/server/node_modules/.bin/tsx
elif [ -x /app/node_modules/.bin/tsx ]; then
  TSX=/app/node_modules/.bin/tsx
else
  echo "[warn] tsx not found, trying npx..."
  TSX="npx tsx"
fi

$TSX index.js &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Give backend a moment to initialise
sleep 2

# ---- Start Next.js frontend ----
echo "[2/2] Starting Next.js frontend on port ${PORT:-3000}..."
cd /app
node server.js &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo "=== Both services started ==="
echo "Backend:  http://127.0.0.1:${BACKEND_PORT:-3001}"
echo "Frontend: http://127.0.0.1:${PORT:-3000}"

# ---- Keep the container alive ----
# Trap signals for graceful shutdown
shutdown() {
  echo "Shutting down..."
  kill $FRONTEND_PID $BACKEND_PID 2>/dev/null || true
  wait $FRONTEND_PID $BACKEND_PID 2>/dev/null || true
  exit 0
}
trap shutdown SIGTERM SIGINT

# Block forever (until a child exits or signal received)
wait
