# AGENTS.md - Drawink Coding Guidelines

## Build/Lint/Test Commands

```bash
# Development (runs socket server + convex + vite)
bun run dev

# Build
bun run build

# Linting
bun run lint          # Check for issues
bun run lint:fix      # Auto-fix issues

# Type checking
bun run typecheck

# Testing (Vitest)
bun vitest run                    # Run all tests
bun vitest run src/core/tests/App.test.tsx    # Run single test file
bun vitest run --reporter=verbose # Run with verbose output
bun vitest watch                  # Run in watch mode

# Convex
bun run dev:convex      # Start Convex dev server
bun run convex:deploy   # Deploy to production
bun run convex:dashboard # Open Convex dashboard

# Utilities
bun run clean           # Clean dist and .vite
```

## Code Style Guidelines

### Linting & Formatting
- **Biome** is used for linting and formatting (configured in `biome.json`)
- Indent: 2 spaces
- Line width: 100 characters
- Quotes: double
- Semicolons: always
- Trailing commas: all (JSON: none)
- Run `bun run lint:fix` before committing

### Imports
- Use `@/` alias for project imports (e.g., `import { x } from "@/lib/common"`)
- Group imports: external libs → internal aliases → relative imports
- Use `import type` for type-only imports
- Biome auto-organizes imports (enabled in config)

### Naming Conventions
- **PascalCase**: Components, interfaces, type aliases
- **camelCase**: Variables, functions, methods, hooks
- **ALL_CAPS**: Constants
- **kebab-case**: File names (e.g., `my-component.tsx`)

### TypeScript Guidelines
- Use TypeScript for all new code
- Prefer immutable data (`const`, `readonly`)
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Prefer implementations without unnecessary allocation
- Trade RAM usage for fewer CPU cycles when optimizing
- Use `type` over `interface` for simple type definitions

### React Guidelines
- Use functional components with hooks
- Follow React hooks rules (no conditional hooks)
- Keep components small and focused
- Use CSS modules or Tailwind for styling

### Error Handling
- Use try/catch for async operations
- Log errors with contextual information
- Implement error boundaries in React components
- Use early returns to avoid deep nesting

### Convex Backend
- Functions go in `convex/` directory
- Use `mutation` for writes, `query` for reads
- Export functions to make them callable from frontend
- Run `bunx convex dev` after adding new functions

## Project Structure

```
convex/           # Convex backend functions
data/             # Storage adapters (Convex, LocalStorage)
core/             # Core drawing engine and components
lib/              # Shared utilities and types
collab/           # Real-time collaboration
tests/            # Test utilities and helpers
```

## Testing

- **Framework**: Vitest with React Testing Library
- **Config**: `vitest.config.mts`
- **Setup**: `setupTests.ts`
- **Environment**: jsdom
- **Coverage thresholds**: lines 60%, branches 70%, functions 63%, statements 60%
- Always run tests after modifications: `bun vitest run`
- Use `reseed(7)` in beforeEach for deterministic tests

## Key Technologies

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Convex (replaces Firebase Firestore)
- **Real-time**: Socket.io (port 3003)
- **Auth**: Clerk
- **Storage**: Firebase Storage (files only)
- **State**: Jotai
- **Styling**: Tailwind CSS, Sass

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:
- `VITE_CONVEX_URL` - Convex deployment URL
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `VITE_APP_WS_SERVER_URL` - Socket.io server (default: http://localhost:3003)

## Notes from Copilot Instructions

- Be succinct; avoid expansive explanations unless asked
- Prefer code over explanations
- Stop apologizing when corrected
- Always attempt to fix problems and offer to run tests
- Include `packages/math/src/types.ts` when writing math code
- Use `Point` type instead of `{ x, y }`
