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
docker compose up -d
pnpm db:generate
pnpm db:deploy
pnpm seed:demo
pnpm check
pnpm dev
```

Copy `.env.example` to `.env.local` and provide development infrastructure before running persistence-backed flows.

The development services are available at:

- Dashboard: `http://localhost:3000`
- Public renderer: `http://doctor.localhost:3001` and `http://clinic.localhost:3001`
- Template Lab: `http://localhost:3002`

`pnpm seed:demo` compiles immutable Doctor and Clinic publication artifacts. The renderer resolves the host to an artifact and loads its exact template through the generic Template SDK pipeline; application code does not import a concrete template.

## Quality gate

Run `pnpm format:check`, `pnpm db:validate`, and `pnpm check` before pushing. GitHub Actions runs the same checks on every pull request and main-branch push.
