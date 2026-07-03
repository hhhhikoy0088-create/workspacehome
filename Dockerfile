# ---- Build Stage: Next.js Frontend ----
FROM node:20-slim AS frontend-builder

WORKDIR /app

# Install Python and build tools needed for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Configure node-gyp to use python3
RUN npm config set python python3

# Copy package files
COPY package.json package-lock.json* ./

# Install frontend deps (use npm install for flexibility)
RUN npm install --legacy-peer-deps

# Copy source and build
COPY . .

# Build with NEXT_PUBLIC_API_BASE_URL=/api so client calls same-origin /api
ENV NEXT_PUBLIC_API_BASE_URL=/api
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next build

# ---- Runtime Stage ----
FROM node:20-slim AS runtime

WORKDIR /app

# Install system deps for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

RUN npm config set python python3

# Copy package files and install ALL deps
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Install server deps
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --legacy-peer-deps

# Copy built Next.js standalone
COPY --from=frontend-builder /app/.next/standalone ./
COPY --from=frontend-builder /app/.next/static ./.next/static
COPY --from=frontend-builder /app/public ./public

# Copy server code
COPY server/ ./server/
COPY ppt-engine/ ./ppt-engine/
COPY ppt/ ./ppt/

# Create data directories
RUN mkdir -p /app/server/outputs/ppt /app/server/uploads /app/data

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV BACKEND_PORT=3001
ENV BACKEND_URL=http://127.0.0.1:3001
ENV DB_DIR=/app/data
ENV NEXT_PUBLIC_API_BASE_URL=/api
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["./start.sh"]
