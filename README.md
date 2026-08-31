# Matrouh Solutions Website Factory

A generic, multi-tenant website platform driven entirely by a versioned Template SDK. Concrete industries live in templates; Factory code contains no Doctor, Clinic, or other vertical-specific behavior.

## Workspace

- `apps/dashboard` — authenticated control plane
- `apps/renderer` — public immutable-site delivery
- `apps/worker` — publication and infrastructure jobs
- `apps/template-lab` — template development harness
- `packages/*` — versioned contracts, engines, features, and adapters
- `templates/*` — auto-discovered concrete templates

Read [ARCHITECTURE.md](./ARCHITECTURE.md), the [engineering specifications](./docs/specifications/), and the [template architecture guide](./templates/TEMPLATE_ARCHITECTURE.md) before contributing.

## Development

### One-command local stack

For an isolated local stack with PostgreSQL, provider bridge, dashboard, renderer, worker, and
Template Lab, run this from a fresh clone:

```bash
docker compose up --build
```

The initial `bootstrap` container applies migrations and seeds demo data before the applications
start. Open the dashboard at `http://localhost:3000`, the public renderer at
`http://localhost:3001`, and Template Lab at `http://localhost:3002`.

This Compose setup is development-only and is not used by the production deployment workflow.
Stop it with `docker compose down`; use `docker compose down --volumes` to also remove local
database, media, and publication data.

### Host-based development

Copy the example environment and start PostgreSQL. On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
docker compose up -d database
```

Then install, migrate, seed, and start the four applications:

```bash
pnpm install
pnpm db:deploy
pnpm seed:demo
pnpm dev
```

`pnpm seed:demo` generates the database client, builds the worker and all retained template versions, installs the template catalog, and prints local staff and client email/password accounts. Use `owner@matrouh.local` for staff workflows and `client@matrouh.local` for `/account`; both use the password printed by the seed. No separate build step is required for this development workflow.

In OIDC deployments, adding a client email prepares a least-privilege client membership and queues a
portal invitation. The identity provider must return a verified email claim matching the invitation;
the client can then view only the websites and billing records connected to that email under
`/account`. Existing clients can be invited or sent access again from the Clients screen.

For non-demo deployments, build template packages and run `pnpm templates:sync` with the deployment
migrator/catalog credential. The command validates immutable hashes, quarantines invalid artifacts,
and rebuilds the derived component index. Run `pnpm db:verify` after every migration deployment.

Copy `.env.example` to `.env.local` and point `DATABASE_URL` at a running PostgreSQL database before running persistence-backed flows. The default local development connection is:

```env
DATABASE_URL="postgresql://factory:factory@localhost:5432/factory"
```

The included Compose service creates the `factory` database and user. If you use an existing PostgreSQL installation instead, create them manually before running `pnpm db:deploy`.

The development services are available at:

- Dashboard: `http://localhost:3000`
- Client portal: `http://localhost:3000/account` (sign in with the client account printed by the seed)
- Public renderer: `http://doctor.localhost:3001`, `http://clinic.localhost:3001`, and `http://engineer.localhost:3001`
- Template Lab: `http://localhost:3002`

Local password sign-in is disabled when `FACTORY_DEPLOYMENT_MODE=production`; production uses
OIDC with PKCE and short-lived, revocable opaque Factory sessions.

`pnpm seed:demo` compiles immutable Doctor, Clinic, and Engineer publication artifacts. The renderer resolves the host to an artifact and loads its exact template through the generic Template SDK pipeline; application code does not import a concrete template.

To stop the local database without deleting its data, run `docker compose stop database`. To start it again, run `docker compose start database`.

## Testing

Install dependencies from the committed pnpm lockfile, then run the test suite explicitly:

```bash
pnpm install --frozen-lockfile
pnpm test
```

Most tests are isolated unit tests. Start the local `database` Compose service before exercising
persistence-backed flows or running migrations:

```bash
docker compose up -d database
pnpm db:deploy
```

Use `pnpm test:coverage` to generate V8 coverage reports and enforce the dashboard's minimum
coverage baseline. CI runs format, lint, typecheck, tests, coverage, build, and a
production-dependency audit on every pull request and push to `main`.

## Quality gate

Run `pnpm format:check`, `pnpm db:validate`, and `pnpm check` before pushing. GitHub Actions runs the same checks on every pull request and main-branch push.
