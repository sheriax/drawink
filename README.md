<a href="https://drawink.app/" target="_blank" rel="noopener">
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Drawink" srcset="https://drawink.nyc3.cdn.digitaloceanspaces.com/github/drawink_github_cover_2_dark.png" />
    <img alt="Drawink" src="https://drawink.nyc3.cdn.digitaloceanspaces.com/github/drawink_github_cover_2.png" />
  </picture>
</a>

<h4 align="center">
  <a href="https://drawink.app">Drawink Editor</a> |
  <a href="https://plus.drawink.app/blog">Blog</a> |
  <a href="https://docs.drawink.app">Documentation</a> |
  <a href="https://plus.drawink.app">Drawink Pro</a>
</h4>

<div align="center">
  <h2>
    An open source virtual hand-drawn style whiteboard. </br>
    Collaborative and end-to-end encrypted. </br>
  <br />
  </h2>
</div>

<br />
<p align="center">
  <a href="https://github.com/drawink/drawink/blob/master/LICENSE">
    <img alt="Drawink is released under the MIT license." src="https://img.shields.io/badge/license-MIT-blue.svg"  />
  </a>
  <a href="https://www.npmjs.com/package/@drawink/drawink">
    <img alt="npm downloads/month" src="https://img.shields.io/npm/dm/@drawink/drawink"  />
  </a>
  <a href="https://docs.drawink.app/docs/introduction/contributing">
    <img alt="PRs welcome!" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat"  />
  </a>
  <a href="https://discord.gg/UexuTaE">
    <img alt="Chat on Discord" src="https://img.shields.io/discord/723672430744174682?color=738ad6&label=Chat%20on%20Discord&logo=discord&logoColor=ffffff&widge=false"/>
  </a>
  <a href="https://deepwiki.com/drawink/drawink">
    <img alt="Ask DeepWiki" src="https://deepwiki.com/badge.svg" />
  </a>
  <a href="https://twitter.com/drawink">
    <img alt="Follow Drawink on Twitter" src="https://img.shields.io/twitter/follow/drawink.svg?label=follow+@drawink&style=social&logo=twitter"/>
  </a>
</p>

<div align="center">
  <figure>
    <a href="https://drawink.app" target="_blank" rel="noopener">
      <img src="https://drawink.nyc3.cdn.digitaloceanspaces.com/github%2Fproduct_showcase.png" alt="Product showcase" />
    </a>
    <figcaption>
      <p align="center">
        Create beautiful hand-drawn like diagrams, wireframes, or whatever you like.
      </p>
    </figcaption>
  </figure>
</div>

## Features

The Drawink editor (npm package) supports:

- 💯&nbsp;Free & open-source.
- 🎨&nbsp;Infinite, canvas-based whiteboard.
- ✍️&nbsp;Hand-drawn like style.
- 🌓&nbsp;Dark mode.
- 🏗️&nbsp;Customizable.
- 📷&nbsp;Image support.
- 😀&nbsp;Shape libraries support.
- 🌐&nbsp;Localization (i18n) support.
- 🖼️&nbsp;Export to PNG, SVG & clipboard.
- 💾&nbsp;Open format - export drawings as an `.drawink` json file.
- ⚒️&nbsp;Wide range of tools - rectangle, circle, diamond, arrow, line, free-draw, eraser...
- ➡️&nbsp;Arrow-binding & labeled arrows.
- 🔙&nbsp;Undo / Redo.
- 🔍&nbsp;Zoom and panning support.

## drawink.app

The app hosted at [drawink.app](https://drawink.app) is a showcase of what you can build with Drawink and features:

- 📡&nbsp;PWA support (works offline).
- 🤼&nbsp;Real-time collaboration through Convex subscriptions.
- 🔒&nbsp;End-to-end encryption.
- 💾&nbsp;Local-first support (autosaves to the browser).
- 🔗&nbsp;Shareable links (export to a readonly link you can share with others).

## Quick start

### For Development

> Lint, TypeScript, Vitest, dependency-audit, and production-build gates are
> enforced by CI. Review the
> [project status](./docs/PROJECT_STATUS.md) for operational and product work
> that remains outside those code-quality gates.

**Prerequisites:**

- Node.js 20.19+ or 22.12+
- Bun 1.3.14+
- Convex and Clerk projects for the hosted application features

**Installation:**

```bash
# Clone the repository
git clone https://github.com/sheriax/drawink.git
cd drawink

# Install dependencies from the pinned lockfile
bun install --frozen-lockfile

# Copy public/client environment variables
cp .env.example .env.local

# Start Convex and Vite
bun run dev
```

The app is available at [http://localhost:5173](http://localhost:5173). Convex
provides the database, realtime subscriptions, scheduled cleanup, and encrypted
file storage; no separate collaboration process is required.

**Environment Setup:**

1. Create a Convex account at [convex.dev](https://convex.dev)
2. Create a Clerk account at [clerk.com](https://clerk.com)
3. Update `.env.local` with public browser configuration:

```bash
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

4. Store server-side Convex secrets with `bunx convex env set`; never commit them
   in `convex/.env`.

See the complete [development guide](./docs/DEVELOPMENT.md) for Clerk webhooks,
Convex variables, local startup, and the quality-gate workflow.

### For npm Package Usage

**Note:** Following instructions are for installing the Drawink [npm package](https://www.npmjs.com/package/@drawink/drawink) when integrating Drawink into your own app.

```bash
npm install react react-dom @drawink/drawink
# or
yarn add react react-dom @drawink/drawink
```

Check out our [documentation](https://docs.drawink.app/docs/@drawink/drawink/installation) for more details!

The current repository is configured as a private application package and does
not have a working root publish pipeline for `@drawink/drawink`. Package
publication and the included Next.js consumer example are tracked as incomplete
in the [project status](./docs/PROJECT_STATUS.md).

## Architecture

Drawink uses a small managed-service architecture:

- **Frontend:** React 19, TypeScript, and Vite (Vercel)
- **Structured backend:** Convex functions and data
- **Authentication:** Clerk with Convex JWT integration and webhooks
- **Live collaboration:** encrypted messages relayed by Convex reactive queries
- **Binary storage:** Convex Storage for encrypted room/share assets

The application and backend functions live in one repository. See
[Architecture](./docs/ARCHITECTURE.md) for component boundaries and data flows.

## Scripts

```bash
# Development
bun run dev          # Start Convex and Vite
bun run dev:convex   # Start only Convex
bun run dev:vite     # Start only Vite

# Build
bun run build   # Build for production
bun run preview # Preview production build

# Convex
bun run convex:deploy    # Deploy Convex functions
bun run convex:dashboard # Open Convex dashboard

# Code Quality
bun run lint             # Lint code
bun run lint:fix         # Lint and fix
bun run typecheck        # Type check
bun run test             # Run Vitest
bun run test:coverage    # Run tests with coverage
bun run audit            # Audit dependencies
bun run check            # Run lint, type-check, and tests
bun run verify           # Run every quality gate and the production build
bun run clean            # Clean build artifacts
```

## Deployment

See the [deployment guide](./docs/deployment/DEPLOY.md) for the Convex and
Vercel deployment, verification, and rollback workflow.

**Build the deployable application targets:**

```bash
bun run build
```

The hosted product requires a Convex production deployment, Clerk integration,
and the documented Vercel variables; follow the runbook rather than deploying
the static output alone.

## Contributing

GitHub Issues are currently disabled for this repository, and a local
`CONTRIBUTING.md` has not yet been added. Review the
[project status](./docs/PROJECT_STATUS.md) before starting a change. Package and
upstream contribution guidance remains available in the external
[Drawink documentation](https://docs.drawink.app/docs/introduction/contributing).

## Integrations

- [VScode extension](https://marketplace.visualstudio.com/items?itemName=pomdtr.drawink-editor)
- [npm package](https://www.npmjs.com/package/@drawink/drawink)

## Who's integrating Drawink

[Google Cloud](https://googlecloudcheatsheet.withgoogle.com/architecture) • [Meta](https://meta.com/) • [CodeSandbox](https://codesandbox.io/) • [Obsidian Drawink](https://github.com/zsviczian/obsidian-drawink-plugin) • [Replit](https://replit.com/) • [Slite](https://slite.com/) • [Notion](https://notion.so/) • [HackerRank](https://www.hackerrank.com/) • and many others

## Sponsors & support

If you like the project, you can become a sponsor at [Open Collective](https://opencollective.com/drawink) or use [Drawink Pro](https://plus.drawink.app/).

## Thank you for supporting Drawink

[<img src="https://opencollective.com/drawink/tiers/sponsors/0/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawink/tiers/sponsors/0/website) [<img src="https://opencollective.com/drawink/tiers/sponsors/1/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawink/tiers/sponsors/1/website) [<img src="https://opencollective.com/drawink/tiers/sponsors/2/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawink/tiers/sponsors/2/website) [<img src="https://opencollective.com/drawink/tiers/sponsors/3/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawink/tiers/sponsors/3/website) [<img src="https://opencollective.com/drawink/tiers/sponsors/4/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawink/tiers/sponsors/4/website) [<img src="https://opencollective.com/drawink/tiers/sponsors/5/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawink/tiers/sponsors/5/website) [<img src="https://opencollective.com/drawink/tiers/sponsors/6/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawink/tiers/sponsors/6/website) [<img src="https://opencollective.com/drawink/tiers/sponsors/7/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawink/tiers/sponsors/7/website) [<img src="https://opencollective.com/drawink/tiers/sponsors/8/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawink/tiers/sponsors/8/website) [<img src="https://opencollective.com/drawink/tiers/sponsors/9/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawink/tiers/sponsors/9/website) [<img src="https://opencollective.com/drawink/tiers/sponsors/10/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawink/tiers/sponsors/10/website)

<a href="https://opencollective.com/drawink#category-CONTRIBUTE" target="_blank"><img src="https://opencollective.com/drawink/tiers/backers.svg?avatarHeight=32"/></a>

Last but not least, we're thankful to these companies for offering their services for free:

[![Vercel](./.github/assets/vercel.svg)](https://vercel.com) [![Sentry](./.github/assets/sentry.svg)](https://sentry.io) [![Crowdin](./.github/assets/crowdin.svg)](https://crowdin.com)
