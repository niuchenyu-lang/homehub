# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY src/server/package*.json ./src/server/
COPY src/client/package*.json ./src/client/

# Install dependencies (npm install since no lock file exists yet)
RUN npm install

# Copy source
COPY . .

# Build client
RUN cd src/client && npm run build

# Build server
RUN cd src/server && npx tsc

# Production stage
FROM node:22-slim

WORKDIR /app

# Install SQLite runtime library (not dev headers)
RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY src/server/package*.json ./src/server/

# Install production dependencies only
RUN npm install --omit=dev

# Copy built assets
COPY --from=builder /app/src/client/dist ./dist
COPY --from=builder /app/src/server/dist ./src/server/dist
COPY --from=builder /app/src/server/package.json ./src/server/package.json

# Create data directory
RUN mkdir -p /data /backups

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/homehub.db

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "src/server/dist/index.js"]
