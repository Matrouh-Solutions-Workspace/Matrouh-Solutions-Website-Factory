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

```bash
pnpm install
pnpm db:deploy
pnpm seed:demo
pnpm dev
```

`pnpm seed:demo` generates the database client, builds the worker and all retained template versions, installs the template catalog, and prints the local dashboard session credential. No separate build step is required for this development workflow.

For non-demo deployments, build template packages and run `pnpm templates:sync` with the deployment
migrator/catalog credential. The command validates immutable hashes, quarantines invalid artifacts,
and rebuilds the derived component index. Run `pnpm db:verify` after every migration deployment.

Copy `.env.example` to `.env.local` and point `DATABASE_URL` at a running PostgreSQL database before running persistence-backed flows. The default local development connection is:

```env
DATABASE_URL="postgresql://factory:factory@localhost:5432/factory"
```

Create the `factory` database and user in your local PostgreSQL installation, then run `pnpm db:deploy` to apply the Prisma migrations.

The development services are available at:

- Dashboard: `http://localhost:3000`
- Public renderer: `http://doctor.localhost:3001` and `http://clinic.localhost:3001`
- Template Lab: `http://localhost:3002`

The local credential flow is disabled when `FACTORY_DEPLOYMENT_MODE=production`; production uses
OIDC with PKCE and short-lived, revocable opaque Factory sessions.

`pnpm seed:demo` compiles immutable Doctor and Clinic publication artifacts. The renderer resolves the host to an artifact and loads its exact template through the generic Template SDK pipeline; application code does not import a concrete template.

## Quality gate

Run `pnpm format:check`, `pnpm db:validate`, and `pnpm check` before pushing. GitHub Actions runs the same checks on every pull request and main-branch push.
