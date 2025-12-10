# Build stage for frontend (using Bun)
FROM --platform=${BUILDPLATFORM} oven/bun:1 AS frontend-build

WORKDIR /opt/app

# Copy package files first for better caching
COPY package.json bun.lock* ./
COPY drawink-app/package.json ./drawink-app/
COPY packages/common/package.json ./packages/common/
COPY packages/drawink/package.json ./packages/drawink/
COPY packages/element/package.json ./packages/element/
COPY packages/math/package.json ./packages/math/
COPY packages/utils/package.json ./packages/utils/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/prettier-config/package.json ./packages/prettier-config/
COPY json-server/package.json ./json-server/
COPY websocket-server/package.json ./websocket-server/

# Install dependencies
RUN bun install

# Copy all source files
COPY . .

ARG NODE_ENV=production

# Build the frontend app
RUN cd drawink-app && VITE_APP_DISABLE_SENTRY=true VITE_APP_DISABLE_PWA=true bun x vite build

# Build stage for json-server
FROM --platform=${BUILDPLATFORM} oven/bun:1 AS json-server-build

WORKDIR /app

COPY json-server/package.json json-server/bun.lock* ./
RUN bun install

COPY json-server/ ./
RUN bun build src/index.ts --outdir=./dist --target=bun

# Build stage for websocket-server
FROM --platform=${BUILDPLATFORM} oven/bun:1 AS websocket-server-build

WORKDIR /app

COPY websocket-server/package.json websocket-server/bun.lock* ./
RUN bun install

COPY websocket-server/ ./
RUN bun build src/index.ts --outdir=./dist --target=bun

# Final stage - runs nginx, json-server, and websocket-server
FROM oven/bun:1-alpine

# Install nginx and supervisor
RUN apk add --no-cache nginx supervisor

# Copy frontend build
COPY --from=frontend-build /opt/app/drawink-app/build /usr/share/nginx/html

# Copy json-server build
COPY --from=json-server-build /app/dist /app/json-server/dist
COPY --from=json-server-build /app/node_modules /app/json-server/node_modules

# Copy websocket-server build
COPY --from=websocket-server-build /app/dist /app/websocket-server/dist
COPY --from=websocket-server-build /app/node_modules /app/websocket-server/node_modules

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Copy supervisor config
COPY docker/supervisord.conf /etc/supervisord.conf

# Expose ports (nginx serves on 3000)
EXPOSE 3000

# Health check
HEALTHCHECK CMD wget -q -O /dev/null http://localhost:3000/health || exit 1

# Run supervisor to manage all processes
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
