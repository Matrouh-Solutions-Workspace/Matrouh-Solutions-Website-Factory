# Matrouh Solutions Website Factory — Architecture Proposal

Status: Approved baseline with required pre-implementation amendments incorporated
Scope: Architecture only; no product implementation is authorized by this document.

## 1. Executive decision

Build the Factory as a modular monolith in a TypeScript monorepo, with independently deployable control-plane, delivery-plane, and worker applications. Keep business modules isolated behind application services and ports. PostgreSQL is the system of record; object storage holds media and immutable publication artifacts; a queue carries asynchronous work; a shared cache accelerates tenant and publication resolution.

The Template SDK is the source of truth for authoring and rendering contracts. The renderer consumes an immutable, versioned `PublicationSnapshot`, never mutable editor tables. This separation is the central scalability and reliability boundary.

Start as a modular monolith rather than microservices. The application boundaries and event contracts permit later extraction, but distributed services now would add operational cost without validated load or team needs.

## 2. Critical review of the brief

### What is correct

- The Factory must remain domain-agnostic and treat template content as opaque JSON outside SDK validation.
- Convention-based template discovery and SDK validation prevent central registries and template conditionals.
- Generic pages, sections, routes, themes, plugins, media, and SEO are sound platform concepts.
- Next.js Server Components fit public delivery and server-led dashboard reads.
- PostgreSQL plus JSONB provides relational integrity around opaque, schema-governed content.

### Gaps that must be resolved

1. **Draft versus published state.** Rendering directly from editable rows causes partial publishes, cache incoherence, and unsafe rollbacks. Publishing must create an immutable snapshot atomically.
2. **Contract and data versioning.** Factory, SDK, renderer, template artifact, content schema, theme schema, plugin API, and snapshot format need independent versions and compatibility rules.
3. **Template artifact lifecycle.** Discovery alone is insufficient. Templates must be built, hashed, verified, quarantined, activated, deprecated, and retained while publications reference them.
4. **Template trust model.** Installed packages execute code. Only trusted templates should run in-process initially. A future marketplace requires signing, provenance, dependency policy, capability declarations, and potentially isolation.
5. **Tenant isolation.** Every tenant-owned table needs `organization_id`; authorization must be enforced in application services and preferably PostgreSQL row-level security as defense in depth.
6. **Concurrency.** Autosave requires optimistic concurrency (`revision`) and idempotency keys. Reordering needs stable order keys, not array-index rewrites.
7. **Publishing semantics.** Publish, rollback, template upgrade, domain activation, and cache invalidation need explicit state machines and audit trails.
8. **Domain security.** Custom-domain ownership verification, hostname normalization, takeover prevention, certificate state, and uniqueness constraints are required.
9. **Media lifecycle.** Direct upload, malware scanning, metadata extraction, variants, quotas, reference tracking, and delayed garbage collection are missing.
10. **Operations.** Jobs, retries, dead-letter handling, observability, backups, restore tests, rate limits, quotas, audit logs, and data export/deletion must be first-class.
11. **Internationalization.** Locale strategy must be defined at website/page/content level; locale fallback belongs to the SDK contract, not a template-specific workaround.
12. **Accessibility and security.** Templates need validation gates for accessibility, CSP compatibility, dependency vulnerabilities, and safe structured data.
13. **Plugin scope.** “Future-ready” should mean a narrow capability-based contract, not arbitrary hooks throughout core modules.
14. **Preview isolation.** Draft previews must use signed, short-lived tokens, bypass public caches, and never make drafts addressable through public hostnames.

### Clarification of “unlimited”

Unlimited means no hardcoded architectural cardinality limit. Real deployments still enforce plan quotas, database limits, payload limits, rate limits, and fair-use controls.

## 3. Architectural principles

1. SDK contracts precede UI, persistence mapping, and rendering implementations.
2. Core modules never import a concrete template or plugin.
3. Dependency direction points inward: apps/adapters → application → domain/contracts.
4. Mutable drafts and immutable publications are separate models.
5. Tenant context is explicit in every command, query, cache key, event, and log.
6. All externally retried mutations are idempotent.
7. Async side effects are emitted through a transactional outbox.
8. JSON is accepted only after size limits and versioned schema validation.
9. Public delivery fails closed for unknown hosts and fails safely to the last good publication.
10. Optimize operational simplicity first; extract services only from measured pressure.

## 4. Recommended technology baseline

- Monorepo: pnpm workspaces + Turborepo.
- Language: TypeScript in strict mode; project references where useful.
- Web: current stable Next.js App Router + React; Node.js runtime by default.
- UI: Tailwind CSS + shadcn/ui primitives.
- Validation/contracts: Zod, JSON Schema export where portability is needed.
- Forms: React Hook Form with schema-derived field adapters.
- Client server-state: TanStack Query only for interaction-heavy dashboard surfaces; Server Components for initial reads.
- Database: PostgreSQL; Prisma for migrations and ordinary access, with SQL migrations for RLS, indexes, and database-specific features.
- Queue: a durable broker abstraction; begin with PostgreSQL-backed jobs or Redis/BullMQ based on hosting, without leaking it into domain code.
- Cache: Redis-compatible shared cache for domain mappings, publication manifests, locks, and rate limits.
- Media: S3-compatible object storage with CDN and direct signed uploads. UploadThing may be an adapter, not a domain dependency.
- Auth: standards-based OIDC/session provider behind an auth port; Factory-owned organizations, memberships, roles, and permissions.
- Observability: OpenTelemetry traces/metrics, structured logs, error tracking, and audit events.
- Tests: Vitest, Testing Library, Playwright, Testcontainers, contract fixtures.

Do not adopt Edge runtime by default: database drivers, template loading, and observability are more predictable on Node.js. CDN caching supplies global delivery initially. Multi-region compute is a later, evidence-driven phase.

## 5. System topology

```text
                         CONTROL PLANE
 Browser ───────────> dashboard (Next.js)
                          │ commands/queries
                          v
                    application modules ───> PostgreSQL
                          │                      │
                          └── transactional outbox
                                             │
                                             v
                                      worker / job broker
                                       │     │      │
                                  publish  media  domains
                                       │
                                       v
                             immutable snapshot + assets

                         DELIVERY PLANE
 Public request ─> CDN/proxy ─> renderer (Next.js) ─> domain cache
                                      │
                                      └─> active snapshot/artifact
```

The dashboard and renderer may share packages but not mutable runtime assumptions. They deploy independently so editor traffic cannot exhaust public delivery capacity.

## 6. Monorepo structure

```text
portfolio-factory/
├─ apps/
│  ├─ dashboard/              # authenticated control plane and internal BFF
│  ├─ renderer/               # public hostname/path rendering and signed preview
│  ├─ worker/                 # publishing, domains, media, outbox, maintenance
│  └─ template-lab/           # local SDK dev, fixtures, validation, visual tests
├─ packages/
│  ├─ template-sdk/           # public authoring contracts and types
│  ├─ template-loader/        # discover and load template artifacts
│  ├─ template-validator/     # manifests, schemas, compatibility, capabilities
│  ├─ template-runtime/       # instantiate, route, and render templates
│  ├─ template-registry/      # installed versions, lifecycle, activation
│  ├─ component-registry/     # discovered component metadata/search index
│  ├─ plugin-sdk/             # narrow capability and lifecycle contracts
│  ├─ plugin-runtime/         # discovery, validation, capability enforcement
│  ├─ publication-contract/   # immutable snapshot schema and migrations
│  ├─ publication-compiler/   # draft → deterministic immutable snapshot
│  ├─ domain/                 # shared value objects/errors; no frameworks
│  ├─ application/            # use cases, ports, policies, DTOs
│  ├─ database/               # Prisma client/schema, SQL migrations, repositories
│  ├─ auth/                   # session adapter, RBAC/permission policy
│  ├─ tenancy/                # tenant context and isolation helpers
│  ├─ content/                # generic draft/page/section/navigation services
│  ├─ publishing/             # publish orchestration, gates, activation/rollback
│  ├─ domains/                # hostname normalization, verification, certificate ports
│  ├─ media/                  # storage/scanner/transform adapters and policies
│  ├─ editor-schema/          # SDK schema → editor field model
│  ├─ ui/                     # accessible platform UI primitives only
│  ├─ observability/          # logs, traces, metrics, audit helpers
│  ├─ jobs/                   # broker interfaces, handlers, retry policy
│  ├─ config/                 # validated runtime configuration
│  └─ testkit/                # builders, fixtures, contract suites
├─ tooling/
│  ├─ eslint-config/
│  ├─ typescript-config/
│  └─ scripts/
├─ docs/
│  ├─ adr/                    # architecture decision records
│  ├─ contracts/
│  ├─ runbooks/
│  └─ threat-model/
├─ templates/                 # first-party template workspaces; auto-discovered
├─ plugins/                   # first-party plugin workspaces; auto-discovered
├─ package.json
├─ pnpm-workspace.yaml
└─ turbo.json
```

`packages/application` can begin as a small shared kernel, but feature code should remain in feature packages. Avoid a “common” or “utils” dumping ground. Public exports are explicit through each package’s `exports` map; deep imports are forbidden.

## 7. Application boundaries

### Dashboard

- Owns authenticated UX and control-plane HTTP endpoints.
- Uses Server Components for initial reads, Server Actions for UI mutations, and Route Handlers for webhooks/external APIs.
- Hosts the dynamic editor shell but does not define template-specific fields.
- May read drafts; never serves a public website.

### Renderer

- Accepts any configured hostname and an optional catch-all path.
- Resolves only active, verified mappings and immutable publications.
- Loads a compatible template artifact and renders the template-owned route/page/sections.
- Supports signed preview as a distinct non-cacheable path.
- Has no draft mutation, admin, or discovery responsibilities.

### Worker

- Claims durable jobs and outbox messages.
- Builds and validates templates; compiles publications; scans/transforms media; verifies domains; coordinates certificates; performs cleanup.
- Uses bounded retries, idempotent handlers, and dead-letter visibility.

### Template Lab

- Gives template authors fixtures, schema validation, visual states, accessibility checks, and contract tests.
- Is development tooling, not a production control-plane dependency.

## 8. Template SDK contract

A template package exports one SDK entry point with a manifest and implementation. Conceptually:

```ts
interface TemplateDefinition {
  manifest: {
    id: TemplateId; // stable namespaced identifier
    version: TemplateVersion; // immutable semver artifact identity
    sdkVersion: string;
    minimumFactoryVersion: string;
    maximumFactoryVersion?: string;
    minimumRendererVersion: string;
    author: string;
    description: string;
    category: string;
    capabilities: string[];
    contentSchemaVersion: number;
    themeSchemaVersion: number;
    publicationSnapshotVersion: number;
  };
  routes: RouteDefinition[];
  pages: PageDefinition[];
  navigation: NavigationDefinition[];
  widgets: Record<WidgetId, WidgetDefinition>;
  blocks: Record<BlockId, BlockDefinition>;
  sections: Record<string, SectionDefinition>;
  themeSchema: Schema;
  websiteSchema?: Schema;
  migrations?: ContentMigration[];
}
```

Every definition supplies an immutable stable ID, a versioned Zod/portable schema where it contains data, defaults, searchable editor metadata, and the appropriate render/composition implementation. Editor metadata describes generic controls, grouping, help, conditions, and validation; it does not embed dashboard components by default.

### Independent compatibility contracts

`sdkVersion` is the exact SDK contract used to author/build the artifact. `minimumFactoryVersion` and optional `maximumFactoryVersion` bound installation and management compatibility. `minimumRendererVersion` gates public rendering. `contentSchemaVersion`, `themeSchemaVersion`, and `publicationSnapshotVersion` independently identify persisted document formats.

The validator evaluates all applicable dimensions before a template can become `ready` or `active`; an unknown or incompatible dimension is a hard failure, not a warning. Compatibility results are stored with the validated artifact and re-evaluated during Factory/renderer upgrades. Deployments must run a pre-upgrade compatibility report over installed and actively published template versions. Existing artifacts and renderer versions remain available until every live publication has migrated or been retired, so upgrades cannot silently break existing sites.

### Page contract

```ts
interface PageDefinition {
  id: PageTypeId;
  title: string; // author-facing label, not identity
  slug: SlugPolicy;
  allowedSections: SectionTypeId[];
  requiredSections: SectionRequirement[];
  defaultSections: DefaultSectionSpec[];
  supportsSEO: boolean;
  supportsNavigation: boolean;
  supportsIndexing: boolean;
}
```

`PageDefinition` describes a template-owned page type. A page instance has its own immutable `PageId` and references the immutable `PageTypeId`. The Factory enforces the declared structural constraints generically but never interprets what a page represents.

### Navigation contract

Navigation behavior belongs to the template SDK. A template exposes one or more `NavigationDefinition` values—for example main, footer, or sidebar—each with an immutable ID, maximum depth, allowed page type IDs, ordering rules, visibility-rule schema, and localization policy. The Factory only validates and persists generic navigation nodes and references; the template determines placement and rendering.

### Widget, block, section, and page composition

```text
Widget definitions → Block definitions → Section definitions → Page definitions → Website
```

- Widgets are the smallest reusable template rendering units, such as buttons, media, or links.
- Blocks compose widgets into reusable content structures.
- Sections compose blocks/widgets into page regions.
- Pages constrain and arrange sections.
- A website binds page instances, navigation, theme, settings, and routes into a publication.

These layers are SDK concepts and template artifacts. The Factory stores their opaque, schema-validated instances and exposes generic editor metadata. Reusable libraries may be shared as template package dependencies, but industry-specific blocks never enter Factory core. The first two production templates may share blocks without coupling their domain meaning to the platform.

### Theme token system

The SDK defines a structured, versioned design-token contract rather than a fixed pair of colors. Token groups cover:

- Colors: background, surface, surface variant, primary/foreground, secondary, accent, success, warning, danger, info, border, muted, text, and heading.
- Layout: border radii, shadows, spacing scale, container widths, and breakpoints.
- Typography: font families, size scale, weights, and line heights.
- Motion: duration scale and easing curves.

Templates consume validated semantic tokens, not arbitrary dashboard-defined CSS values. A template can constrain, require, default, or extend tokens through its `themeSchema`; the Factory presents and persists the schema generically. Unsafe raw CSS is not accepted as a theme token.

### Immutable identifier rules

Template IDs, exact template-version identities, route IDs, page type and instance IDs, widget IDs, block IDs, section type and instance IDs, navigation IDs/nodes, theme IDs, plugin IDs, media IDs, and publication IDs are immutable. Human-readable names, titles, and slugs are editable attributes and are never runtime identity. References and events use IDs; aliases/slugs are resolved to IDs at boundaries. IDs are never recycled after deletion.

Rules:

- `templateId + templateVersion` is immutable.
- Stable section type IDs are never reused with incompatible meaning.
- Schema changes require a version bump and, when applicable, a deterministic migration.
- Factory, renderer, SDK, schema, theme, and snapshot compatibility are all checked before activation and again during platform upgrade planning.
- Templates declare capabilities (media, forms, client JS, external fetch) and receive only approved platform APIs.
- Template renderers receive a serializable render context, not database clients, secrets, or unrestricted platform services.
- The Factory may validate, store, version, and transport content but may not branch on its semantic fields.

### Split package responsibilities

- `template-sdk`: public contracts, branded ID types, authoring helpers, and contract test interfaces. It performs no discovery or rendering.
- `template-loader`: discovers artifact candidates from configured sources and loads packages by immutable artifact identity. It makes no activation decision.
- `template-validator`: validates manifests, schemas, version compatibility, capabilities, integrity, and policy. It does not persist lifecycle or render pages.
- `template-runtime`: instantiates an already validated artifact, resolves template routes, and renders pages, sections, blocks, and widgets.
- `template-registry`: owns installed templates and versions, lifecycle state, activation/deprecation, and artifact references.
- `publication-compiler`: converts a frozen generic draft plus exact validated template into a deterministic immutable publication snapshot.

### Discovery

At build/catalog time, scan configured workspace roots and later package sources for a manifest convention such as `matrouh.template.json`. Import candidates only in the worker/build environment, validate manifest and exports, build an artifact, calculate a content hash, run contract/security checks, then write catalog state.

Runtime must not scan the filesystem per request. It resolves an already-cataloged artifact by immutable identity. “No registration” means no hand-edited central code registry; the database catalog is a discovered operational index.

### Component registry

`component-registry` is a derived, searchable index populated from validated template and plugin manifests. It exposes metadata for section, block, widget, theme, and plugin definitions to editor tooling and later marketplace search. It never imports concrete components manually and never becomes the source of truth; immutable artifacts and their manifests remain authoritative. Registry entries are namespaced by owner/template/plugin ID and exact version, preventing collisions and preserving historical publications.

Suggested lifecycle: `discovered → validating → ready | quarantined → deprecated → retired`. Retirement is blocked while a live publication references the version.

## 9. Plugin boundary

Delay general-purpose plugins until core extension points are proven. Initial plugins may subscribe to versioned domain events or implement explicit capabilities such as form submission sinks, analytics injection, or SEO augmentation.

- Plugin manifests declare SDK range, permissions, configuration schema, event subscriptions, and network/secrets needs.
- Plugins cannot mutate core tables directly.
- Calls go through capability-scoped ports with timeouts and circuit breakers.
- Renderer hooks must have strict latency budgets and safe fallback behavior.
- Plugin failure must not corrupt publication or take down a website.

## 10. Data model and ownership

Core relational entities:

- `Organization`, `User`, `Membership`, `Role`, `Permission`, `Session`
- `Client`
- `Website`, `WebsiteLocale`, `WebsiteSettings`
- `PageDraft`, `SectionDraft`, `NavigationDraft`, `ThemeDraft`, `SeoDraft`
- `Publication`, `PublicationArtifact`, `PublicationActivation`
- `TemplateCatalogEntry`, `TemplateVersion`, `PluginCatalogEntry`, `PluginInstallation`
- `Domain`, `DomainVerificationAttempt`, `CertificateBinding`
- `MediaAsset`, `MediaVariant`, `MediaFolder`, `MediaReference`
- `Job`, `OutboxEvent`, `AuditEvent`, `IdempotencyRecord`

All tenant-owned records include `organization_id`, and child uniqueness constraints include it where appropriate. Use opaque IDs (UUIDv7 or equivalent), normalized unique hostnames, timestamps, actor IDs, and revision numbers.

JSONB belongs in:

- section content, theme tokens, generic settings, SEO/structured data;
- validated snapshot payloads;
- versioned manifest metadata.

JSONB does not replace relational fields needed for ownership, lifecycle, ordering, uniqueness, querying, authorization, or referential integrity. Store schema/version beside each JSON document. Set content depth and byte limits.

### Draft model

Draft tables are normalized enough for editing. A section has `id`, `page_id`, `type`, `schema_version`, `content_json`, `order_key`, `revision`, and timestamps. Mutations use `WHERE revision = expectedRevision`, increment revision, and return a conflict otherwise. Fractional/ranked order keys avoid rewriting every sibling during drag/drop.

### Publication model

A publication is immutable and includes:

- website and organization identity;
- template ID, exact version, and artifact hash;
- snapshot schema version;
- locale/routes/pages/sections/navigation/theme/SEO/settings;
- referenced media identities/variants;
- creation actor/time and source draft revision;
- integrity hash.

Activation is a small atomic pointer update from a website to a validated publication. Rollback changes the pointer to an older compatible publication; it never rewrites history.

## 11. Generic rendering pipeline

```text
1. Receive request
2. Normalize hostname (lowercase, IDNA, remove port/trailing dot)
3. Reject reserved/unknown/unverified hostnames
4. Resolve DomainMapping from shared cache, then database
5. Resolve website's active Publication identity
6. Load and integrity-check immutable PublicationSnapshot
7. Verify snapshot/template SDK compatibility
8. Resolve locale and template-owned route against pathname
9. Build restricted RenderContext
10. Ask template runtime to render route/page/section tree
11. Generate metadata, canonical URL, robots and structured data
12. Return streamed HTML with cache/surrogate headers
```

Cache keys always include hostname mapping version, publication ID, locale, path, and relevant variant flags. Because publication IDs are immutable, most invalidation is pointer invalidation: activate a new ID and purge/expire the old hostname manifest. Never cache draft previews publicly.

Errors:

- Unknown host: neutral 404, never the dashboard or another tenant.
- Missing path: template-provided not-found rendering where supported.
- New publication failure: retain the last active publication.
- Template runtime failure: trace by publication/template IDs and serve a controlled error response; do not leak internals.

No template switch is needed: registry resolution returns a validated runtime adapter keyed by immutable template identity.

## 12. End-to-end data flows

### Edit/autosave

```text
Editor UI → generic command → auth + tenant policy → SDK schema validation
→ optimistic revision update → audit/outbox → updated draft revision
```

The client keeps local history for immediate undo/redo initially. Server-side command history can later persist durable collaborative history. Autosave is debounced, idempotent, and conflict-aware.

### Preview

```text
Preview request → permission check → freeze requested draft revision
→ publication-compiler creates temporary immutable snapshot
→ store with short expiry → issue signed single-purpose preview token
→ renderer loads temporary snapshot → identical route/render pipeline as production
```

Preview never renders draft rows directly. Temporary snapshots implement the same `PublicationSnapshot` contract and pass the same compatibility and render validation as durable publications; they differ only in lifecycle, activation, authorization, and cache policy. They cannot become a website's active publication implicitly. Preview responses are private/no-store, tokens are short-lived and audience-bound, and expired artifacts are garbage-collected.

### Publish

```text
Publish command → permission/idempotency check → freeze source revision
→ enqueue compile job → load exact template → validate full draft
→ resolve media + routes → compile deterministic snapshot
→ store artifact + DB record → smoke render → atomic activation
→ invalidate hostname manifest/CDN → audit/event
```

The publish request returns a job/status resource rather than holding an HTTP request open. Every step is resumable and idempotent.

### Public request

```text
Host/path → domain mapping → active publication → immutable snapshot
→ template runtime → SSR/streamed response → CDN
```

There is no dashboard API round trip from a Server Component. The renderer calls its read port directly. Client-side template code receives only serialized public props.

### Custom domain

```text
User enters domain → normalize + reserve pending record → issue DNS challenge
→ worker verifies ownership repeatedly → attach provider/certificate
→ verify TLS and routing → mark active → update domain cache
```

Ownership challenges must be unpredictable and rotated on reassignment. A domain cannot bind to two active websites.

### Media

```text
Request upload → quota/type policy → signed direct upload → quarantine
→ scan + metadata + variants → ready → reference from draft
→ publication pins required variants → CDN delivery
```

Deletion is soft first; garbage collection occurs only after retention and when no draft or publication references remain.

## 13. Module boundaries

Each module exposes commands, queries, events, and ports—not ORM models.

| Module            | Owns                                        | Must not own                            |
| ----------------- | ------------------------------------------- | --------------------------------------- |
| Identity & Access | sessions, memberships, roles, permissions   | template content                        |
| Organizations     | tenant lifecycle, plans/quotas              | authentication provider internals       |
| Clients           | generic client records and notes            | websites’ content meaning               |
| Websites          | lifecycle, settings, selected template      | rendering implementation                |
| Content           | generic drafts, pages, sections, navigation | industry fields                         |
| Templates         | catalog and artifact lifecycle              | manual concrete imports                 |
| Publishing        | compile, validate, activate, rollback       | editor UI                               |
| Rendering         | host/path resolution and snapshot rendering | draft mutation                          |
| Themes            | generic token documents and validation      | template-specific controls              |
| Media             | assets, variants, folders, references       | section semantics                       |
| Domains           | ownership, DNS, TLS binding status          | provider-specific logic in domain layer |
| SEO               | generic metadata documents/policies         | template-specific page types            |
| Plugins           | installations and capabilities              | unrestricted core hooks                 |
| Audit/Jobs        | durable records and execution policy        | feature decisions                       |

Cross-module writes happen through application commands. Cross-module reactions use outbox-backed events. Read models may join across modules for dashboard views, but those joins do not grant write ownership.

### Versioned platform domain events

Domain events are the primary asynchronous communication mechanism between modules. Direct synchronous calls remain appropriate when a command needs an immediate invariant or result; events do not replace transactions or turn the modular monolith into accidental distributed choreography.

Every event envelope contains `eventId`, immutable event `type`, integer `version`, `occurredAt`, `organizationId` where applicable, `actor`, `correlationId`, `causationId`, aggregate type/ID/revision, and a schema-validated payload. Event names are past-tense facts. Payloads contain IDs and stable values, not ORM objects or unbounded snapshots.

Initial event catalog includes versioned forms of:

- `WebsiteCreated`, `WebsitePublished`, `WebsiteRolledBack`
- `SectionAdded`, `SectionRemoved`
- `ThemeChanged`, `MediaUploaded`
- `TemplateInstalled`, `TemplateActivated`
- `PluginInstalled`, `DomainVerified`

Events are written to a transactional outbox in the same database transaction as state changes, then delivered at least once. Consumers must be idempotent and track processed event IDs. Schema evolution is additive within a version; breaking payload changes create a new event version. A registry of event schemas, owners, retention, and consumers lives with platform contracts. Audit records and domain events are related but distinct: audit answers who did what; events coordinate reactions.

## 14. Security and isolation baseline

- Resolve session → organization → membership on every control-plane request.
- Deny by default; permissions are action/resource based, with website scoping where needed.
- Set tenant context on every repository operation; add PostgreSQL RLS as defense in depth and test for cross-tenant leakage.
- Never derive tenant solely from user-submitted IDs.
- Encrypt transport and managed storage; isolate secrets by environment/provider.
- Sanitize or structurally constrain rich text; enforce CSP and safe URL protocols.
- Validate uploaded content by bytes, not filename; quarantine until scanned.
- Sign preview and webhook requests; rate-limit auth, uploads, previews, and public dynamic endpoints.
- Preserve immutable audit events for privileged mutations, publishing, domains, roles, and exports.
- Establish backup, point-in-time recovery, restore drills, retention, export, and erasure policies.
- Threat-model template code, domain takeover, stored XSS, SSRF, broken object authorization, and supply-chain compromise before public beta.

## 15. Scalability path

### Initial production

- One primary PostgreSQL cluster, shared cache, object storage/CDN, durable worker queue.
- Separately scaled dashboard, renderer, and workers.
- CDN caches immutable assets and suitable HTML responses.
- Read-through domain/publication caches with short negative caching.

### Growth

- Read replicas for public metadata if measured useful.
- Partition high-volume audit/job/event tables by time or tenant.
- Dedicated image transformation service/CDN.
- Queue partitioning and concurrency controls per organization/website.
- Precomputed publication manifests near renderer regions.

### Multi-region

- Keep publishing and writes in a home region initially.
- Replicate immutable publication artifacts globally.
- Distribute domain-to-publication mappings through a globally replicated store/CDN configuration.
- Render close to users only after template artifacts and observability support it.
- Define consistency explicitly: publication activation may be globally eventual, but never partially compiled.

Do not claim active-active PostgreSQL writes until conflict semantics and operational need justify them.

## 16. Testing and quality gates

- Unit tests for value objects, policies, schema conversion, and state machines.
- Repository integration tests against real PostgreSQL, including RLS and concurrent revision conflicts.
- SDK contract suite run against every template version.
- Golden snapshot/compiler tests ensuring deterministic publication artifacts.
- Renderer tests for host/path/locale/metadata and invalid content.
- Playwright flows for create → edit → preview → publish → custom host resolution.
- Security tests for tenant isolation, preview token leakage, XSS, SSRF, uploads, and domain takeover.
- Load tests centered on hostname resolution, cached render throughput, publish bursts, and noisy tenants.
- Upgrade tests across supported SDK/snapshot versions.

A template cannot become `ready` without manifest/schema validation, build success, representative renders, accessibility baseline, bundle/dependency policy, and contract tests.

## 17. AI-ready structured content

AI workflows are future command producers, not a parallel content model. They use the same versioned SDK schemas, validation, permissions, revisions, preview snapshots, publication gates, and audit trail as human editor commands.

Design requirements now:

- Every generatable website, page, section, block, widget, SEO document, theme, and localized value has an immutable ID and machine-readable schema.
- Schemas include descriptions, examples/defaults, constraints, localization annotations, media/reference semantics, and editor hints that can also guide structured generation.
- Generated output is structured JSON validated by the exact template/schema versions; free-form HTML/CSS is not a bypass.
- Generation commands record model/provider metadata, prompt/template version, actor, provenance, target revision, and idempotency key without storing secrets.
- AI changes land in drafts, respect optimistic concurrency, and require the same preview/publish authorization as human changes.
- Rewrite and translation preserve IDs and reference graphs unless an explicit command creates new objects.
- Sensitive data, tenant boundaries, consent, moderation, cost quotas, and provider retention are enforced through an `AIProvider` port.

Interfaces for `GenerateWebsite`, `GeneratePage`, `GenerateSection`, `GenerateSEO`, `GenerateTheme`, `RewriteContent`, and `TranslateContent` may be defined when shaping their schemas. Provider orchestration and user-facing AI features are deferred until a concrete first-release use case is approved.

## 18. Implementation roadmap

### Implementation discipline

Every implemented package, abstraction, background service, or extension point must support a concrete acceptance scenario in at least one of the first two production templates, Doctor and Clinic. Those names may appear in product templates and acceptance fixtures, never as Factory branches, core entities, or platform schemas.

If an anticipated capability has no Doctor/Clinic production use case, document its interface, compatibility constraints, and ADR only; do not build its runtime implementation. Implement now: Template SDK, discovery/loading/validation/registry, component metadata index needed by the editor, publication compiler/snapshots, generic renderer, draft editor foundations, media foundations, and domain management. Design but defer: third-party template/plugin marketplaces, multi-region deployment, advanced collaboration, and enterprise identity federation.

### Phase 0 — Decisions and executable contracts

Milestones:

- Approve this architecture and write ADRs for deployment target, package manager, auth, queue, object storage, cache, domain/TLS provider, and template trust model.
- Define terminology, immutable branded IDs, independent compatibility contracts, lifecycle state machines, permission matrix, SLOs, quotas, event envelopes, and threat model.
- Implement only contract prototypes: Template SDK page/navigation/widget/block/section/theme schemas, publication schema, and Doctor/Clinic representative template fixtures.

Exit gate: the Doctor and Clinic templates can be expressed without Factory domain changes, their metadata can generate editor field models, and all seven version compatibility dimensions have passing and failing contract fixtures.

### Phase 1 — Monorepo and platform foundation

- Establish workspace, CI, strict TypeScript, lint/format/test, configuration validation, observability, local infrastructure, migrations, and testkit.
- Create organization/auth context, repository boundaries, audit/outbox primitives, and health/readiness endpoints.

Exit gate: CI proves package boundaries; cross-tenant integration tests pass; migrations and restore procedure work in a staging-like environment.

### Phase 2 — Template SDK and catalog

- Build the separated loader, validator, runtime, registry, component-registry, manifest/schema contracts, workspace discovery, artifact hashing, compatibility checks, Template Lab, and catalog UI.
- Add Doctor and Clinic as production template packages and architectural contract tests; their business concepts remain outside Factory packages.

Exit gate: dropping a conforming template into `templates/` makes it discoverable, validated, component-indexed, and usable without changing Factory source or hand-maintained registries.

### Phase 3 — Core control plane

- Implement clients, websites, draft pages/sections/navigation/theme/SEO, generic schema-driven forms, media basics, RBAC, and audit views.
- Implement revision-aware commands and ranked section ordering.

Exit gate: authorized users can create and edit generic content; all writes validate against the selected template version; tenant-isolation tests pass.

### Phase 4 — Publication and public renderer

- Implement the dedicated deterministic publication compiler, durable publish jobs, immutable artifacts, temporary preview snapshots, smoke renders, activation/rollback, hostname resolution, route/locale resolution, metadata, CDN/shared cache strategy, and signed preview.

Exit gate: a failed publish leaves the last good site active; rollback is atomic; two templates render through the identical pipeline with no template branches.

### Phase 5 — Editor experience and media hardening

- Add drag/drop, duplicate/delete/reorder, client undo/redo command log, autosave/conflict UX, responsive live preview, folders/search, scanning, variants, quotas, and GC.

Exit gate: editing survives refresh and conflicts safely; preview never leaks into public caches; referenced media cannot be prematurely deleted.

### Phase 6 — Domains, TLS, and production readiness

- Implement subdomain provisioning, custom-domain verification, certificate adapter, takeover defenses, status UI, rate limits, backup/restore drills, alerts, runbooks, performance/security/accessibility testing.

Exit gate: automated domain lifecycle passes end to end; SLO/load targets and disaster-recovery objectives are demonstrated; threat-model findings are closed or accepted.

### Phase 7 — Plugin pilot and scale optimization

- Add only proven capability-based plugin points, signed artifacts/provenance, failure isolation, marketplace-ready metadata, usage metering, and measured caching/partitioning optimizations.

Exit gate: a plugin can fail without affecting publication integrity or core rendering, and removal leaves no orphaned core state.

### Phase 8 — Multi-region and marketplace (when justified)

- Global artifact replication, mapping distribution, regional rendering, marketplace review/signing, billing/licensing, compatibility and deprecation automation.

Exit gate: defined regional failover and consistency behavior is tested; marketplace supply-chain controls are operational.

## 19. Architecture decisions still requiring owner input

These do not block approval of the logical architecture, but they block implementation choices:

1. Deployment target: Vercel, container platform, or hybrid.
2. Auth provider and whether enterprise SSO is an early requirement.
3. Queue/cache managed services available in the target environment.
4. DNS and certificate provider(s), plus whether customers delegate DNS or only create records.
5. First-party-only templates at launch versus third-party marketplace code.
6. Data residency, compliance, retention, RPO/RTO, and availability targets.
7. Localization model: translated page trees, localized values within content, or both.
8. Initial plan quotas and expected payload/media/site traffic envelopes.

## 20. Explicit non-goals for the first release

- Arbitrary untrusted template execution.
- General-purpose plugin marketplace.
- Real-time multi-user collaborative editing.
- Active-active multi-region writes.
- Per-customer deployment forks.
- Template-specific dashboard modules or content tables.
- A visual website builder unconstrained by template schemas.
- AI generation runtime without an approved Doctor/Clinic release scenario.

## 21. Acceptance invariants

Architecture and implementation are acceptable only if all remain true:

- Installing a compatible template requires no edit to Factory application source.
- No Factory module branches on a concrete template, section, or industry identity.
- Public requests render only immutable, successfully validated publications.
- Every tenant-owned operation proves organization scope.
- Template/content incompatibility is detected before activation.
- Factory and renderer upgrades produce an explicit compatibility report and cannot silently strand an active template/publication.
- Publish and rollback are atomic from a visitor’s perspective.
- Preview and production traverse the same immutable snapshot rendering pipeline.
- Runtime identity always uses immutable IDs, never display names or mutable slugs.
- Internal asynchronous reactions use versioned, outbox-delivered domain events with idempotent consumers.
- Renderer, dashboard, and workers can scale and fail independently.
- Provider choices remain adapters behind owned ports.
- The last known-good publication survives editor, worker, and failed-publish incidents.
- Implemented abstractions have a concrete Doctor or Clinic acceptance use case; future-only capabilities remain contracts or ADRs.

## 22. Pre-implementation amendment traceability

| Required amendment               | Authoritative design location                      | Verification gate                                                      |
| -------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| Independent version contracts    | §8, Independent compatibility contracts            | Incompatible fixture per dimension plus pre-upgrade report             |
| Split template responsibilities  | §6 package tree; §8 Split package responsibilities | Package-boundary tests and forbidden dependency rules                  |
| Page contract                    | §8 Page contract                                   | Doctor/Clinic page fixtures validate allowed/required/default sections |
| Navigation in SDK                | §8 Navigation contract                             | Navigation rules vary by template without Factory source changes       |
| Expanded theme tokens            | §8 Theme token system                              | Both templates validate and render semantic token documents            |
| Immutable IDs                    | §8 Immutable identifier rules; §10                 | Rename/slug-change tests preserve all references and events            |
| Widget/block/section/page layers | §8 composition model                               | Shared library artifact is consumed without a Factory-domain import    |
| Snapshot preview                 | §12 Preview                                        | Preview and production pass the same renderer contract suite           |
| Component registry               | §6; §8 Component registry                          | Discovery automatically indexes versioned component metadata           |
| Platform domain events           | §13 Versioned platform domain events               | Outbox atomicity, duplicate delivery, and version-evolution tests      |
| AI-ready structured content      | §17                                                | Structured generated fixtures pass the same schema/publish gates       |
| First-two-template rule          | §18 Implementation discipline                      | Every implemented abstraction maps to a Doctor/Clinic acceptance case  |
