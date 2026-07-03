#!/bin/bash

echo "=== Starting Workspace ==="

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
npx tsx index.js &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Give backend a moment to initialise, then wait until it is ready
sleep 2

BACKEND_URL="http://127.0.0.1:${BACKEND_PORT:-3001}/api/ping"
echo "Waiting for backend to be ready at ${BACKEND_URL}..."
for i in $(seq 1 60); do
  if curl -sf "${BACKEND_URL}" >/dev/null 2>&1; then
    echo "Backend ready after ${i}s"
    break
  fi
  echo "  Backend not ready yet (${i}/60)..."
  sleep 1
done

if ! curl -sf "${BACKEND_URL}" >/dev/null 2>&1; then
  echo "WARNING: Backend did not become ready in 60s; starting frontend anyway"
fi

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
