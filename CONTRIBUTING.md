# Contributing

Thanks for contributing to Matrouh Solutions Website Factory.

## Prerequisites

- Node.js 22 or newer
- pnpm 10.33.2 (`corepack enable` is recommended)
- PostgreSQL 16 or newer, or Docker Compose for the local database

## Local setup

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
docker compose up -d database
pnpm db:deploy
pnpm seed:demo
pnpm dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.

The local dashboard is available at `http://localhost:3000`; the renderer runs at
`http://localhost:3001`. See [README.md](./README.md) for demo accounts and the
full development-service map.

## Before opening a pull request

Run the existing quality gate from the repository root:

```bash
pnpm format:check
pnpm db:validate
pnpm check
```

`pnpm check` runs linting, type checking, tests, and production builds. Persistence-backed
flows require the local PostgreSQL service. `pnpm test:coverage` produces a local coverage
report; it is informational while coverage baselines are established.

## Change guidelines

- Keep templates industry-specific; Factory packages stay generic.
- Include tests with behavior changes, especially for publishing, authentication, media, and
  tenant access paths.
- Keep pull requests focused and use conventional commit messages where practical.
- Do not commit `.env.local`, credentials, generated runtime artifacts, or production data.
