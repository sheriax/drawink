FROM oven/bun:1.3.14-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --production --frozen-lockfile

# Copy source code
COPY . .

# Set default port but allow overriding string
ENV PORT=3003

# Expose port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e 'fetch("http://127.0.0.1:" + (process.env.PORT || "3003") + "/").then((response) => response.ok || process.exit(1)).catch(() => process.exit(1))'

# Start server
CMD ["bun", "index.ts"]
