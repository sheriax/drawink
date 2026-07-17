# Next.js integration example (legacy)

This example is retained as migration reference, but it is **not runnable from
the current `master` branch**.

Its scripts still expect:

- a removed `packages/drawink` workspace;
- a missing root `build:packages` script;
- package font output at `packages/drawink/dist/prod/fonts`;
- Yarn workspace behavior that the current root repository does not define.

Running `yarn dev` therefore fails before Next.js starts. The old README also
linked port 3000 while the script uses port 3005.

## Restoration options

Choose one product direction before repairing the example:

1. **Published-package example:** depend on a released `@drawink/drawink`
   version, copy assets from that installed package, and remove all root
   workspace build assumptions.
2. **Repository-workspace example:** restore a buildable editor package in this
   repository, define it in the root workspace, and make the example consume the
   workspace package.
3. **Hosted-app-only repository:** remove this example and the package-install
   claims from the root README.

Whichever option is selected, add this example to CI with a clean install and
production build. Keep its React/Next.js compatibility aligned with the package
peer dependencies.

See [Project status](../../docs/PROJECT_STATUS.md#12-package-distribution-is-not-wired)
for the repository-level decision and related type-check failures.
