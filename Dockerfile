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

# Install dependencies
RUN bun install --frozen-lockfile

# Copy all source files
COPY . .

ARG NODE_ENV=production

# Build the frontend app
RUN bun run build:app:docker

# Build stage for json-backend
FROM --platform=${BUILDPLATFORM} oven/bun:1 AS backend-build

WORKDIR /app

COPY json-backend/package.json json-backend/bun.lock* ./
RUN bun install --frozen-lockfile

COPY json-backend/ ./
RUN bun build src/index.ts --outdir=./dist --target=bun

# Final stage - runs both nginx and json-backend
FROM --platform=${TARGETPLATFORM} oven/bun:1-alpine

# Install nginx and supervisor
RUN apk add --no-cache nginx supervisor

# Copy frontend build
COPY --from=frontend-build /opt/app/drawink-app/build /usr/share/nginx/html

# Copy json-backend build
COPY --from=backend-build /app/dist /app/dist
COPY --from=backend-build /app/node_modules /app/node_modules

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Copy supervisor config
COPY docker/supervisord.conf /etc/supervisord.conf

# Expose ports
EXPOSE 80 3001

# Health check
HEALTHCHECK CMD wget -q -O /dev/null http://localhost || exit 1

# Run supervisor to manage both processes
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
