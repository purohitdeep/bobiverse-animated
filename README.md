# Bobiverse Atlas

A modular web app for exploring Bobiverse star systems, timelines, and replicant movement in a cinematic 3D atlas.

## Status

Research preview, actively built out. Working today:

- Reader-first atlas shell with global search, linked system/map/event selection, and an accessible directory fallback
- Spoiler-safe reading frontier controls with explicit curated chapter boundaries for Books 1–3
- Deterministic time scrubbing, play/pause playback, event filters, linked event-to-map focus, and shareable URL state
- 3D neighborhood scene with catalog coordinates, sourced routes, replicant markers, and explicit in-transit progress
- Replicant ledger with identity, generation, lineage-ready records, and story-frame location state
- Provenance and review surfaces for events, systems, identities, routes, and source links
- Workspace-wide strict TypeScript, unit tests, content audit, referential-integrity validation, and CI

Current coverage is intentionally honest: 3 books, 6 curated chapter boundaries, 7 systems, 10 provisional timeline events, 5 replicants, and 1 sourced journey (22 records awaiting primary-text review in total). Arbitrary chapter selection, primary-text fact-level locators, and a fully verified canon are not yet available. Seed content remains in TypeScript until the content-package loader is introduced.

## Requirements

Node.js 22.6 or newer (`engines` field is enforced; the content audit uses native TypeScript type stripping).

## Structure

- `apps/web` - the interactive React and Three.js experience
- `packages/domain` - canonical types and validation schemas
- `packages/data` - normalized source data and source metadata
- `packages/simulation` - coordinate transforms and world-state helpers
- `docs` - roadmap, content model, and workflow notes

## Commands

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 4173
npm run check
npm run build
npm run test
```

`npm run check` is the full quality gate and runs lint, strict typechecking
for every workspace, unit tests, the content audit (provenance rules plus
referential integrity), and the production build. CI runs the same gate.

## Docs

- `docs/ROADMAP.md`
- `docs/CONTENT_MODEL.md`
- `docs/SOURCES.md`
- `docs/WORKFLOW.md`
- `docs/REVIEW_PLAN.md`
