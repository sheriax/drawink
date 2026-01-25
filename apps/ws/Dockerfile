# Standalone Dockerfile for WebSocket server
# Can be built independently for production deployment

FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY apps/ws/package.json ./apps/ws/
COPY packages/types/package.json ./packages/types/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY apps/ws ./apps/ws
COPY packages/types ./packages/types

# Build the WebSocket server
WORKDIR /app/apps/ws
RUN bun run build

# Production image
FROM oven/bun:1-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/apps/ws/dist ./dist
COPY --from=builder /app/apps/ws/node_modules ./node_modules

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:8080/health || exit 1

# Start the server
CMD ["bun", "dist/index.js"]
