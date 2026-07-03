#!/bin/bash
set -e

echo "=== Starting Shrimp Workspace ==="

# Start Express backend (port 3001)
echo "[1/2] Starting Express backend on port $BACKEND_PORT..."
cd /app/server
npx tsx index.js &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 2

# Start Next.js frontend (port from $PORT, default 3000)
echo "[2/2] Starting Next.js frontend on port $PORT..."
cd /app
node server.js &
FRONTEND_PID=$!

echo "=== Both services started ==="
echo "Backend PID: $BACKEND_PID (port $BACKEND_PORT)"
echo "Frontend PID: $FRONTEND_PID (port $PORT)"

# Wait for either process to exit
wait -n $BACKEND_PID $FRONTEND_PID
EXIT_CODE=$?

echo "A process exited with code $EXIT_CODE, shutting down..."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
exit $EXIT_CODE
