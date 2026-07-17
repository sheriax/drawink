# Project coding standards

These instructions describe the current single-repository layout. Consult
[`docs/DEVELOPMENT.md`](../docs/DEVELOPMENT.md) for setup and
[`docs/PROJECT_STATUS.md`](../docs/PROJECT_STATUS.md) before assuming the quality
gates are green.

## Communication

- Be concise and assume the collaborator is comfortable with technical detail.
- Prefer concrete code and evidence over generic explanations.
- State verification results and unresolved risks after making changes.

## TypeScript Guidelines

- Use TypeScript for all new code
- Where possible, prefer implementations without allocation
- When there is an option, opt for more performant solutions and trade RAM usage for less CPU cycles
- Prefer immutable data (const, readonly)
- Use optional chaining (?.) and nullish coalescing (??) operators

## React Guidelines

- Use functional components with hooks
- Follow the React hooks rules (no conditional hooks)
- Keep components small and focused
- Use CSS modules for component styling

## Naming Conventions

- Use PascalCase for component names, interfaces, and type aliases
- Use camelCase for variables, functions, and methods
- Use ALL_CAPS for constants

## Error Handling

- Use try/catch blocks for async operations
- Implement proper error boundaries in React components
- Always log errors with contextual information

## Testing

- Run the checks relevant to a change: `bun run typecheck`, `bun run lint`,
  `bun run test`, `bun run build`, and `bun run build:collab`.
- Do not describe a green build-only workflow as a passing test suite.
- The baseline currently has known type, lint, and test failures; distinguish
  pre-existing failures from regressions.

## Math types

- Read `src/lib/math/types.ts` when changing math code.
- Use the branded `LocalPoint` and `GlobalPoint` types rather than ad hoc
  `{ x, y }` objects.
