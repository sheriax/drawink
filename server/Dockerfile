FROM oven/bun:1.3.3-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --production

# Copy source code
COPY . .

# Set default port but allow overriding string
ENV PORT=3003

# Expose port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/ || exit 1

# Start server
CMD ["bun", "index.ts"]
