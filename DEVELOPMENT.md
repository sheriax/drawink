# Drawink Development Guide

This guide will help you get started developing Drawink locally.

## Quick Start

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Start all services:**
   ```bash
   bun dev
   ```

That's it! The app will be available at:
- **Frontend**: http://localhost:3000 (or the port shown in terminal)
- **JSON Server**: http://localhost:3001
- **WebSocket Server**: http://localhost:3003

---

## Available Commands

### Development

| Command | Description |
|--------|-------------|
| `bun dev` | Start all services (frontend, json-server, websocket-server) |
| `bun dev:frontend` | Start only the frontend |
| `bun dev:backend` | Start only backend services (json-server + websocket-server) |
| `bun start` | Start frontend only (legacy command) |
| `bun start:backend` | Start json-server only (legacy command) |

### Building

| Command | Description |
|--------|-------------|
| `bun build` | Build the frontend app for production |
| `bun build:packages` | Build all packages (common, math, element, drawink) |
| `bun build:app` | Build the frontend app |
| `bun build:preview` | Build and preview the production build locally |

### Testing

| Command | Description |
|--------|-------------|
| `bun test` | Run tests in watch mode |
| `bun test:all` | Run all tests (typecheck, lint, format, unit tests) |
| `bun test:coverage` | Run tests with coverage |
| `bun test:ui` | Run tests with UI |

### Code Quality

| Command | Description |
|--------|-------------|
| `bun fix` | Fix linting and formatting issues |
| `bun fix:code` | Fix linting issues only |
| `bun fix:other` | Fix formatting issues only |

### Deployment

| Command | Description |
|--------|-------------|
| `bun deploy` | Deploy to Cloud Run (with confirmation) |
| `bun deploy:quick` | Deploy to Cloud Run (skip confirmation) |

---

## Project Structure

```
drawink/
├── drawink-app/          # Main frontend application
│   ├── src/              # Source code
│   ├── build/             # Production build output
│   └── package.json
├── packages/              # Shared packages
│   ├── common/           # Common utilities
│   ├── drawink/          # Core Drawink library
│   ├── element/          # Element types
│   ├── math/             # Math utilities
│   └── utils/            # Utility functions
├── json-server/          # Backend API server
├── websocket-server/     # WebSocket server for collaboration
├── scripts/              # Build and utility scripts
└── examples/             # Example integrations
```

---

## Development Workflow

### Starting Development

1. **Start all services:**
   ```bash
   bun dev
   ```

   This starts:
   - Frontend (Vite dev server) on port 3000
   - JSON Server (API) on port 3001
   - WebSocket Server (collaboration) on port 3003

2. **Open your browser:**
   The frontend will automatically open at http://localhost:3000

### Making Changes

- **Frontend changes**: Hot module replacement (HMR) will automatically reload
- **Backend changes**: Services will automatically restart with hot reload
- **Package changes**: You may need to rebuild packages:
  ```bash
  bun build:packages
  ```

### Environment Variables

The frontend uses environment variables from the root directory. Common variables:

- `VITE_APP_BACKEND_V2_GET_URL` - Backend GET endpoint
- `VITE_APP_BACKEND_V2_POST_URL` - Backend POST endpoint
- `VITE_APP_PORT` - Frontend port (default: 3000)
- `VITE_APP_DISABLE_SENTRY` - Disable Sentry (for local dev)
- `VITE_APP_DISABLE_PWA` - Disable PWA features

These are automatically set when using `bun dev`.

---

## Troubleshooting

### Port Already in Use

If you see "port already in use" errors:

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:3001 | xargs kill -9  # JSON Server
lsof -ti:3003 | xargs kill -9  # WebSocket Server
```

Or use different ports by setting environment variables:

```bash
VITE_APP_PORT=3000 PORT=3001 WEBSOCKET_SERVER_PORT=3003 bun dev
```

### Services Not Starting

1. **Check dependencies:**
   ```bash
   bun install
   ```

2. **Check if ports are available:**
   ```bash
   lsof -i :3000
   lsof -i :3001
   lsof -i :3003
   ```

3. **Check logs:**
   Each service outputs colored logs. Look for error messages in the terminal.

### Firebase Connection Issues

The JSON server requires Firebase credentials. Make sure:

1. `firebase-project/drawink-2026-firebase-adminsdk.json` exists
2. The file has valid credentials
3. The Firebase project is accessible

### Build Errors

If you encounter build errors:

1. **Clean build artifacts:**
   ```bash
   bun run rm:build
   ```

2. **Rebuild packages:**
   ```bash
   bun build:packages
   ```

3. **Reinstall dependencies:**
   ```bash
   bun run clean-install
   ```

### TypeScript Errors

If you see TypeScript errors:

1. **Check type definitions:**
   ```bash
   bun run test:typecheck
   ```

2. **Restart the TypeScript server** in your IDE

### Hot Reload Not Working

1. **Check if HMR is enabled** in Vite config
2. **Clear browser cache** and hard refresh (Cmd+Shift+R)
3. **Restart the dev server:**
   ```bash
   # Stop with Ctrl+C, then:
   bun dev
   ```

---

## Working with Packages

### Building Packages

Packages need to be built before they can be used:

```bash
# Build all packages
bun build:packages

# Build individual packages
bun build:common
bun build:math
bun build:element
bun build:drawink
```

### Making Changes to Packages

When you change code in `packages/`:

1. **Rebuild the package:**
   ```bash
   bun build:packages
   ```

2. **Restart the dev server** if changes don't appear

### Package Development

For faster iteration during package development, you can use the source directly (no build needed) by modifying import paths, but this is not recommended for production.

---

## Testing

### Running Tests

```bash
# Run all tests
bun test

# Run tests once (no watch)
bun test:all

# Run with coverage
bun test:coverage

# Run with UI
bun test:ui
```

### Writing Tests

Tests are located in:
- `drawink-app/tests/` - App-specific tests
- Package tests are co-located with source files

---

## Code Quality

### Linting

```bash
# Check for linting errors
bun test:code

# Fix linting errors
bun fix:code
```

### Formatting

```bash
# Check formatting
bun test:other

# Fix formatting
bun fix:other

# Fix both
bun fix
```

---

## Docker Development

You can also use Docker for development:

```bash
# Start all services in Docker
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

See `docker-compose.yml` for configuration.

---

## Common Issues

### "Cannot find module" Errors

1. **Rebuild packages:**
   ```bash
   bun build:packages
   ```

2. **Reinstall dependencies:**
   ```bash
   bun install
   ```

### Slow Build Times

1. **Use Bun** (already configured) - it's faster than npm/yarn
2. **Clear build cache:**
   ```bash
   bun run rm:build
   ```

### Memory Issues

If you encounter memory issues:

1. **Increase Node memory limit:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" bun dev
   ```

2. **Close other applications**

---

## Getting Help

- **Documentation**: See [README.md](./README.md) and [DEPLOY.md](./DEPLOY.md)
- **Issues**: Report bugs on GitHub
- **Discord**: Join the community on Discord

---

## Next Steps

- Read the [Deployment Guide](./DEPLOY.md) to learn how to deploy
- Check out the [Contributing Guide](https://docs.drawink.app/docs/introduction/contributing)
- Explore the [API Documentation](https://docs.drawink.app)
