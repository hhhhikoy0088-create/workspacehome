#!/bin/bash
set -e

echo "=== Starting Shrimp Workspace ==="

# Ensure data dirs exist
mkdir -p /app/server/outputs/ppt /app/server/uploads /app/data

# Copy bundled db to data volume if it doesn't exist yet
if [ -f /app/server/market.db ] && [ ! -f /app/data/market.db ]; then
  echo "[init] Copying bundled database to persistent volume..."
  cp /app/server/market.db /app/data/market.db
fi

# Start Express backend
start_backend() {
  echo "[1/2] Starting Express backend on port $BACKEND_PORT..."
  cd /app/server
  # Use tsx from server node_modules if available
  if [ -x /app/server/node_modules/.bin/tsx ]; then
    TSX=/app/server/node_modules/.bin/tsx
  elif [ -x /app/node_modules/.bin/tsx ]; then
    TSX=/app/node_modules/.bin/tsx
  else
    echo "[error] tsx not found"
    exit 1
  fi

  $TSX index.js > /app/server.log 2>&1 &
  BACKEND_PID=$!
  echo "Backend PID: $BACKEND_PID"

  # Wait until backend is ready
  for i in {1..30}; do
    if curl -s http://127.0.0.1:$BACKEND_PORT/api/ping > /dev/null 2>&1; then
      echo "[ok] Backend ready after ${i}s"
      return 0
    fi
    sleep 1
  done

  echo "[error] Backend failed to start. Last 50 lines of /app/server.log:"
  tail -n 50 /app/server.log
  exit 1
}

start_backend

# Start Next.js frontend
echo "[2/2] Starting Next.js frontend on port $PORT..."
cd /app
node server.js > /app/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait until frontend is ready
for i in {1..30}; do
  if curl -s http://127.0.0.1:$PORT/ > /dev/null 2>&1; then
    echo "[ok] Frontend ready after ${i}s"
    break
  fi
  sleep 1
done

echo "=== Both services started ==="

# Graceful shutdown handler
shutdown() {
  echo "Shutting down..."
  kill $FRONTEND_PID $BACKEND_PID 2>/dev/null || true
  wait $FRONTEND_PID $BACKEND_PID 2>/dev/null || true
  exit 0
}
trap shutdown SIGTERM SIGINT

# Keep script alive and wait for children
wait $FRONTEND_PID $BACKEND_PID
