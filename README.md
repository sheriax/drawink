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
- 🤼&nbsp;Real-time collaboration (powered by Convex).
- 🔒&nbsp;End-to-end encryption.
- 💾&nbsp;Local-first support (autosaves to the browser).
- 🔗&nbsp;Shareable links (export to a readonly link you can share with others).

## Quick start

### For Development

**Prerequisites:**
- Node.js >= 18.0.0
- Bun (recommended) or npm

**Installation:**

```bash
# Clone the repository
git clone https://github.com/drawink/drawink.git
cd drawink

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env.local

# Start development server (runs both Convex and Vite)
bun dev
```

The app will be available at [http://localhost:5173](http://localhost:5173)

**Environment Setup:**

1. Create a Convex account at [convex.dev](https://convex.dev)
2. Create a Clerk account at [clerk.com](https://clerk.com)
3. Update `.env.local` with your credentials:

```bash
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### For npm Package Usage

**Note:** Following instructions are for installing the Drawink [npm package](https://www.npmjs.com/package/@drawink/drawink) when integrating Drawink into your own app.

```bash
npm install react react-dom @drawink/drawink
# or
yarn add react react-dom @drawink/drawink
```

Check out our [documentation](https://docs.drawink.app/docs/@drawink/drawink/installation) for more details!

## Architecture

Drawink uses a **modern, simplified architecture**:

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Convex (serverless, real-time database)
- **Authentication:** Clerk
- **Deployment:** Static hosting (Vercel, Netlify, Cloudflare Pages, etc.)

**No Docker, no complex monorepo setup** - just a clean, single-app architecture.

## Scripts

```bash
# Development
bun dev              # Start both Convex and Vite
bun dev:convex       # Start only Convex
bun dev:vite         # Start only Vite

# Build
bun build            # Build for production
bun preview          # Preview production build

# Convex
bun convex:deploy    # Deploy Convex functions
bun convex:dashboard # Open Convex dashboard

# Code Quality
bun lint             # Lint code
bun lint:fix         # Lint and fix
bun typecheck        # Type check
bun clean            # Clean build artifacts
```

## Deployment

See [DEPLOY.md](./DEPLOY.md) for detailed deployment instructions.

**Quick deploy:**

```bash
# Build
bun build

# Deploy to Vercel (recommended)
vercel --prod

# Or deploy to Netlify
netlify deploy --prod

# Or deploy to Firebase
firebase deploy --only hosting
```

## Contributing

- Missing something or found a bug? [Report here](https://github.com/drawink/drawink/issues).
- Want to contribute? Check out our [contribution guide](https://docs.drawink.app/docs/introduction/contributing) or let us know on [Discord](https://discord.gg/UexuTaE).
- Want to help with translations? See the [translation guide](https://docs.drawink.app/docs/introduction/contributing#translating).

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
