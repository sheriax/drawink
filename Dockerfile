# Build stage for frontend (using Bun)
FROM --platform=${BUILDPLATFORM} oven/bun:1 AS frontend-build

WORKDIR /opt/app

# Copy package files first for better caching
COPY package.json bun.lock* ./
COPY turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY apps/ws/package.json ./apps/ws/
COPY packages/common/package.json ./packages/common/
COPY packages/drawink/package.json ./packages/drawink/
COPY packages/element/package.json ./packages/element/
COPY packages/math/package.json ./packages/math/
COPY packages/utils/package.json ./packages/utils/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/trpc/package.json ./packages/trpc/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN bun install

# Copy all source files
COPY . .

ARG NODE_ENV=production
ARG VITE_CONVEX_URL
ARG VITE_CLERK_PUBLISHABLE_KEY

# Build the frontend app
RUN cd apps/web && \
    VITE_APP_DISABLE_SENTRY=true \
    VITE_APP_DISABLE_PWA=true \
    VITE_CONVEX_URL=${VITE_CONVEX_URL} \
    VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY} \
    bun x vite build

# Build stage for API server
FROM --platform=${BUILDPLATFORM} oven/bun:1 AS api-build

WORKDIR /app

COPY apps/api/package.json apps/api/bun.lock* ./
RUN bun install

COPY apps/api/ ./
RUN bun build src/index.ts --outdir=./dist --target=bun

# Build stage for WebSocket server
FROM --platform=${BUILDPLATFORM} oven/bun:1 AS ws-build

WORKDIR /app

COPY apps/ws/package.json apps/ws/bun.lock* ./
RUN bun install

COPY apps/ws/ ./
RUN bun build src/index.ts --outdir=./dist --target=bun

# Final stage - runs nginx, json-server, and websocket-server
FROM oven/bun:1-alpine

# Install nginx and supervisor
RUN apk add --no-cache nginx supervisor

# Copy frontend build
COPY --from=frontend-build /opt/app/apps/web/build /usr/share/nginx/html

# Copy API server build
COPY --from=api-build /app/dist /app/api/dist
COPY --from=api-build /app/node_modules /app/api/node_modules

# Copy WebSocket server build
COPY --from=ws-build /app/dist /app/ws/dist
COPY --from=ws-build /app/node_modules /app/ws/node_modules

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Copy supervisor config
COPY docker/supervisord.conf /etc/supervisord.conf

# Copy Firebase service account for json-server
COPY firebase-project/drawink-2026-firebase-adminsdk.json /app/firebase-project/drawink-2026-firebase-adminsdk.json

# Expose ports (nginx serves on 3000)
EXPOSE 3000

# Health check
HEALTHCHECK CMD wget -q -O /dev/null http://localhost:3000/health || exit 1

# Run supervisor to manage all processes
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
