# Template Architecture and Authoring Guide

This directory contains templates for the Matrouh Solutions Website Factory. A template owns visual design, routes, page types, navigation behavior, widgets, blocks, sections, theme constraints, and template-specific content schemas. The Factory owns infrastructure and treats template content as opaque validated JSON.

## Non-negotiable boundary

A template may depend on `@factory/template-sdk`. No Factory package may import a concrete template. Adding a template must require only adding its conforming package under `templates/` (and, later, installing a compatible external artifact). Never add `if template === ...`, template switches, manual imports, or industry fields to Factory packages.

## Composition model

```text
Widgets → Blocks → Sections → Pages → Website
```

- Widget: smallest reusable component, such as a button, image, address, or link group.
- Block: composition of widgets/other permitted blocks, such as a card.
- Section: page-level region composed from blocks/widgets, such as a hero or gallery.
- Page: template-owned structural contract describing allowed, required, and default sections.
- Website: page instances, template-defined navigation, theme, SEO, settings, and locales.

These are SDK definitions. Instance content is stored generically by the Factory. Shared visual building blocks belong in a template-owned package under `templates/shared`, never in Factory core.

## Required package layout

```text
templates/<template-name>/
├─ src/
│  ├─ index.ts                 # exports only `template`
│  ├─ definition.ts
│  ├─ routes/
│  ├─ pages/
│  ├─ navigation/
│  ├─ widgets/
│  ├─ blocks/
│  ├─ sections/
│  ├─ theme/
│  └─ migrations/
├─ fixtures/
│  ├─ minimal/
│  ├─ complete/
│  ├─ locales/
│  └─ invalid/
├─ tests/
│  ├─ contract/
│  ├─ rendering/
│  ├─ accessibility/
│  └─ visual/
├─ generated/
│  └─ matrouh.template.manifest.json
├─ matrouh.template.json
└─ package.json
```

## Immutable identity

Every definition and instance has an immutable ID. Definition IDs use namespaced lowercase values such as `com.matrouh.doctor/section/hero`. Titles, export keys, names, and slugs are never runtime identifiers. Released IDs cannot be reused with incompatible meaning.

Required version declarations:

- `sdkVersion`
- `minimumFactoryVersion`
- optional `maximumFactoryVersion`
- `minimumRendererVersion`
- `contentSchemaVersion`
- `themeSchemaVersion`
- `publicationSnapshotVersion`

The Factory validates every dimension before a version becomes ready or active.

## Definition outline

```ts
import { defineTemplate } from "@factory/template-sdk";

export const template = defineTemplate({
  manifest: {
    id: "com.example.template",
    version: "1.0.0",
    author: "Example",
    description: "Example template",
    category: "business",
  },
  compatibility: {
    sdkVersion: "1.0.0",
    minimumFactoryVersion: "0.1.0",
    minimumRendererVersion: "0.1.0",
    contentSchemaVersion: 1,
    themeSchemaVersion: 1,
    publicationSnapshotVersion: 1,
  },
  websiteSchema,
  theme,
  routes,
  pages,
  navigation,
  widgets,
  blocks,
  sections,
  migrations: [],
});
```

The executable entry exports `template`. The build generates a portable, code-free manifest used for discovery, editor tooling, compatibility checks, and component search.

## Pages and navigation

Every page definition declares its immutable ID, author-facing title, slug policy, allowed/required/default sections, and whether it supports SEO, navigation, and indexing. Navigation definitions declare maximum depth, allowed page types, ordering, visibility, localization, and node kinds. The Factory persists nodes; the template owns behavior and rendering.

## Schemas and editor metadata

All content uses versioned structured schemas. Use descriptions, bounds, defaults, examples, localization annotations, media/reference semantics, and generic editor hints. Never use unbounded arbitrary HTML/CSS or runtime-only validation for security-critical constraints.

Editor controls are generic IDs such as `text`, `textarea`, `number`, `select`, `media`, and `reference`. Templates cannot import dashboard UI. Unsupported schema constructs fail validation instead of silently degrading.

## Theme tokens

Templates consume semantic tokens rather than raw unstructured CSS:

- colors: background, surfaces, primary/foreground, secondary, accent, state colors, border, muted, text, heading;
- layout: radii, shadows, spacing, container widths, breakpoints;
- typography: font families, sizes, weights, line heights;
- motion: durations and easing curves.

Templates may constrain/default/extend namespaced tokens. Reduced-motion accessibility remains mandatory.

## Rendering rules

Templates render only from immutable snapshot content and the restricted render context. They do not access databases, filesystem, secrets, raw headers/cookies, or undeclared network services. Use the provided media/link/capability interfaces. Client components receive JSON-serializable public props only.

Preview and production use the same renderer. A render must be deterministic for identical snapshot/context except for explicitly declared capabilities.

## Migrations

Content/theme migrations are explicit, pure, deterministic edges between integer schema versions. They validate output against the target schema, cannot rewrite active publication snapshots, and must have an unambiguous tested path. Template upgrades are explicit website actions, never Factory deployment side effects.

## Required tests

Each template must pass:

- SDK contract and immutable-ID/reference-graph tests;
- portable/executable schema consistency;
- minimal, complete, localized, and deliberately invalid fixtures;
- route ambiguity/reserved path tests;
- page/navigation/composition constraints;
- deterministic manifest/artifact build;
- representative server rendering and preview parity;
- accessibility and visual regression baselines;
- compatibility pass/fail fixtures for every declared version dimension.

## Release checklist

1. Bump exact template version for any released artifact change.
2. Never alter an already published version/artifact.
3. Add migrations for persisted schema changes.
4. Regenerate and review the portable manifest.
5. Run contract, render, accessibility, and visual tests.
6. Confirm no Factory source edit is required for discovery.
7. Confirm the prior artifact remains available while publications reference it.

For exact contracts, read [Specification 03](../docs/specifications/03-template-sdk-implementation.md), [rendering](../docs/specifications/04-rendering-pipeline.md), and [publication](../docs/specifications/05-publication-pipeline.md).
