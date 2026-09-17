# Bobiverse Atlas

A modular web app for exploring Bobiverse star systems, timelines, and replicant movement in a cinematic 3D atlas.

## Status

Early foundation, actively built out. Working today:

- Workspace structure with strict TypeScript checking across all packages
- 3D neighborhood scene with selection and orbit controls
- Seed star data with provenance, review states, and a source catalog
- Chapter-scope controls that keep events spoiler-safe per reading frontier
- A content audit plus referential-integrity validation that run in CI

Still missing: replicant (Bob) records and travel routes, content files on disk (seed data is in code), and per-chapter coverage beyond curated boundaries.

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
