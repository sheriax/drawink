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

---

## Phase 3: Monorepo Architecture (NEW)

### Overview

The project now uses Turborepo for monorepo management with the following structure:

```
drawink/
├── apps/
│   ├── web/          # Main web app (Next.js 15, React 19, Clerk Auth)
│   ├── api/          # tRPC API server (Hono, Firebase, Clerk)
│   ├── ws/           # WebSocket server (real-time collaboration)
│   └── landing/      # Marketing landing page (Astro)
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── trpc/         # tRPC router definitions
│   ├── drawink/      # Core drawing engine
│   ├── element/      # Element types and utilities
│   ├── common/       # Shared utilities
│   ├── utils/        # Helper functions
│   └── math/         # Math utilities
```

### Running Turborepo Apps

**Start all apps** (recommended):
```bash
bun run dev
```

**Start specific app**:
```bash
# Web app only
bun run dev --filter=@drawink/web

# API server only
bun run dev --filter=@drawink/api

# WebSocket server only
bun run dev --filter=@drawink/ws
```

### Environment Variables (Monorepo)

#### Root Environment Files
- `.env.development` - Development configuration (used by Turborepo)
- `.env.production` - Production configuration

#### App-Specific Environment Files

**apps/web/.env.local**:
```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# API Configuration (tRPC)
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3003

# Firebase Configuration (JSON format - REQUIRED)
VITE_APP_FIREBASE_CONFIG='{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}'

# App Configuration
VITE_APP_GIT_SHA=development
VITE_APP_DISABLE_PWA=false
VITE_APP_PLUS_LP=https://plus.drawink.app
VITE_APP_PLUS_APP=http://localhost:3000
```

**apps/api/.env.local**:
```bash
# Clerk Secret (for JWT verification)
CLERK_SECRET_KEY=sk_test_...

# Firebase Admin SDK (JSON format)
FIREBASE_ADMIN_SDK={"projectId":"...","privateKey":"...","clientEmail":"..."}
```

### Phase 3 Features

#### Organization Selector
- Located in top-right corner
- Switch between personal workspace and organizations
- Uses tRPC: `trpc.organization.myOrganizations`

#### Dashboard (`/dashboard`)
- View recent boards (currently from localStorage)
- Quick create board button
- Team activity section (placeholder)

#### Projects Sidebar
- New sidebar tab with folder icon
- View and manage projects/folders
- Create new projects
- Organization-aware (personal or org projects)

### API Endpoints (tRPC)

#### Organization Routes
- `organization.getById` - Get organization by ID (public)
- `organization.myOrganizations` - Get user's organizations (protected)
- `organization.getMembers` - Get org members (protected)
- `organization.getMyRole` - Get user's role (protected)
- `organization.isMember` - Check membership (protected)

#### Project Routes
- `project.getById` - Get project by ID (protected)
- `project.myProjects` - Get user's personal projects (protected)
- `project.organizationProjects` - Get org projects (protected)
- `project.create` - Create new project (protected)
- `project.update` - Update project (protected)
- `project.archive` - Soft delete (protected, owner only)
- `project.delete` - Permanent delete (protected, owner only)

### Troubleshooting Phase 3 Issues

#### White Screen / Firebase Error

**Error**: `Firebase: No Firebase App '[DEFAULT]' has been created - call initializeApp() first`

**Root Cause**: Missing or incorrectly formatted `VITE_APP_FIREBASE_CONFIG` in `apps/web/.env.local`

**Solution**:
1. Ensure `apps/web/.env.local` exists
2. Add `VITE_APP_FIREBASE_CONFIG` as a **JSON string** (not individual variables):
   ```bash
   VITE_APP_FIREBASE_CONFIG='{"apiKey":"AIzaSy...","authDomain":"drawink-2026.firebaseapp.com",...}'
   ```
3. Restart dev server: `bun run dev --filter=@drawink/web`

#### API Connection Refused

**Error**: `GET http://localhost:3001/trpc/organization.myOrganizations net::ERR_CONNECTION_REFUSED`

**Root Cause**: API server not running

**Solution**:
```bash
# Option 1: Start all services
bun run dev

# Option 2: Start API server separately
bun run dev --filter=@drawink/api
```

Verify API is running:
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

#### tRPC Type Errors

**Error**: Type errors in tRPC calls or routers

**Solution**: Rebuild type packages after changes:
```bash
# Rebuild types package
bun run build --filter=@drawink/types

# Rebuild trpc package
bun run build --filter=@drawink/trpc

# Or rebuild all packages
bun run build
```

#### Clerk Authentication Issues

**Error**: `401 Unauthorized` or token verification failures

**Solution**:
1. Check `VITE_CLERK_PUBLISHABLE_KEY` in `apps/web/.env.local`
2. Check `CLERK_SECRET_KEY` in `apps/api/.env.local`
3. Ensure keys match (same Clerk application)
4. Restart both web and API servers

#### Organization Selector Not Loading

**Symptoms**: Dropdown shows no organizations

**Debugging**:
1. Check browser console for errors
2. Verify API server is running (port 3001)
3. Check network tab for tRPC call: `organization.myOrganizations`
4. Ensure user is authenticated (Clerk session)

**Solution**:
```bash
# Restart API server
bun run dev --filter=@drawink/api

# Check API logs for errors
```

#### Projects Sidebar Empty

**Symptoms**: No projects show in sidebar

**Debugging**:
1. Check if API server is running
2. Verify tRPC call in network tab: `project.myProjects` or `project.organizationProjects`
3. Check Firestore database for projects collection

**Solution**:
- If personal workspace: Projects should be under userId
- If organization: Projects should be under organizationId
- Verify Firestore security rules allow reads

### Building Monorepo Packages

After making changes to shared packages:

```bash
# Build all packages
bun run build

# Build specific package
bun run build --filter=@drawink/types

# Type check
bun run typecheck

# Lint
bun run lint
```

### Monorepo Commands

```bash
# Clean build artifacts
bun run rm:build

# Clean node_modules
bun run rm:node_modules

# Clean install (after dependency issues)
bun run clean-install

# Format code
bun run format

# Format check
bun run format:check

# Format fix
bun run format:fix
```

### Phase 3 Documentation

For detailed Phase 3 implementation:
- See [PHASE_3_COMPLETION.md](./PHASE_3_COMPLETION.md)
- See [deep-cooking-summit.md](./deep-cooking-summit.md) for full project plan

---

## Next Steps

- Read the [Deployment Guide](./DEPLOY.md) to learn how to deploy
- Check out the [Contributing Guide](https://docs.drawink.app/docs/introduction/contributing)
- Explore the [API Documentation](https://docs.drawink.app)
- Review [PHASE_3_COMPLETION.md](./PHASE_3_COMPLETION.md) for latest features
