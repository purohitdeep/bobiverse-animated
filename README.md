# Bobiverse Atlas

A modular web app for exploring Bobiverse star systems, timelines, and replicant movement in a cinematic 3D atlas.

## Status

Research preview, actively built out. Working today:

- Reader-first atlas shell with global search, linked system/map/event selection, and an accessible directory fallback
- Spoiler-safe reading frontier controls with explicit curated chapter boundaries for Books 1–3
- Deterministic time scrubbing, play/pause playback, event filters, linked event-to-map focus, and shareable URL state that tracks the live frame
- 3D neighborhood scene with catalog coordinates, sourced routes, replicant markers, and explicit in-transit progress
- Replicant ledger with identity, generation, lineage-ready records, and story-frame location state
- Provenance and review surfaces for events, systems, identities, routes, and source links
- Workspace-wide strict TypeScript, unit and component tests, content audit, referential-integrity validation, and CI

Current coverage is intentionally honest: 3 books, 6 curated chapter boundaries, 7 systems, 10 provisional timeline events, 5 replicants, and 1 sourced journey (22 records awaiting primary-text review in total). Arbitrary chapter selection, primary-text fact-level locators, and a fully verified canon are not yet available. Seed content remains in TypeScript until the content-package loader is introduced.

## Testing

`npm run test` runs 73 tests across five files. Pure logic and data contracts run in a node environment. Component tests opt into jsdom per file with a `@vitest-environment jsdom` docblock, so only the files that need a DOM pay for it. URL view-state tests cover both directions: a shared link is validated before it is applied, and every later edit is mirrored back into the query string.

## Requirements

Node.js 22.6 or newer (`engines` field is enforced; the content audit uses native TypeScript type stripping). Docker with Compose is optional and only needed to run the containerised build.

## Structure

- `apps/web` - the interactive React and Three.js experience
- `packages/domain` - canonical types and validation schemas
- `packages/data` - normalized source data and source metadata
- `packages/simulation` - coordinate transforms and world-state helpers
- `docs` - roadmap, content model, and workflow notes
- `docker/nginx.conf` - static serving rules for the built atlas

## Commands

The atlas is served on **port 6055** everywhere: local dev, preview, and the container all use the same origin, so a shared link works in any of them. `strictPort` is on, so a busy port fails loudly rather than silently moving to another one.

```bash
npm install
npm run dev
npm run check
npm run build
npm run test
```

`npm run check` is the full quality gate and runs lint, strict typechecking
for every workspace, unit tests, the content audit (provenance rules plus
referential integrity), and the production build. CI runs the same gate.

## Docker

The runtime image is nginx serving the static Vite build; the Node toolchain
is build-only and does not ship. Build and start:

```bash
docker compose up -d --build
```

Then open <http://localhost:6055>.

```bash
docker compose ps          # health status and published port
docker compose logs -f     # follow nginx logs
docker compose down        # stop and remove the container
```

`docker/` holds the nginx server block. Content-hashed assets under
`/assets/` are served with a one-year immutable cache, `index.html` is never
cached, and any unmatched path falls back to the app shell so deep links
resolve. `/healthz` returns `200 ok` and backs the container health check.

The image is intentionally static: there is no backend, and the atlas holds
its reading frame in the query string, so a container restart never loses a
reader's position.

## Docs

- `docs/ROADMAP.md`
- `docs/CONTENT_MODEL.md`
- `docs/SOURCES.md`
- `docs/WORKFLOW.md`
- `docs/REVIEW_PLAN.md`
