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

# Start Express backend in background
start_backend() {
  echo "[1/2] Starting Express backend on port $BACKEND_PORT..."
  cd /app/server
  if [ -x /app/server/node_modules/.bin/tsx ]; then
    TSX=/app/server/node_modules/.bin/tsx
  elif [ -x /app/node_modules/.bin/tsx ]; then
    TSX=/app/node_modules/.bin/tsx
  else
    echo "[error] tsx not found"
    exit 1
  fi

  $TSX index.js &
  BACKEND_PID=$!
  echo "Backend PID: $BACKEND_PID"

  for i in {1..15}; do
    if curl -s http://127.0.0.1:$BACKEND_PORT/api/ping > /dev/null 2>&1; then
      echo "[ok] Backend ready after ${i}s"
      return 0
    fi
    sleep 1
  done

  echo "[error] Backend failed to start."
  exit 1
}

start_backend

# Start Next.js frontend in background
echo "[2/2] Starting Next.js frontend on port $PORT..."
cd /app
node server.js &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

for i in {1..15}; do
  if curl -s http://127.0.0.1:$PORT/ > /dev/null 2>&1; then
    echo "[ok] Frontend ready after ${i}s"
    break
  fi
  sleep 1
done

echo "=== Both services started ==="

# Keep script as PID 1, handle signals
shutdown() {
  echo "Shutting down..."
  kill $FRONTEND_PID $BACKEND_PID 2>/dev/null || true
  wait $FRONTEND_PID $BACKEND_PID 2>/dev/null || true
  exit 0
}
trap shutdown SIGTERM SIGINT

# Keep the script alive
wait $FRONTEND_PID $BACKEND_PID
