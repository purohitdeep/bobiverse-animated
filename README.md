# Bobiverse Atlas

A modular web app for exploring Bobiverse star systems, timelines, and replicant movement in a cinematic 3D atlas.

## Status

Early foundation. The repo has the workspace structure, initial 3D scene shell, seed star data, and shared domain/simulation packages.

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
```

## Docs

- `docs/ROADMAP.md`
- `docs/CONTENT_MODEL.md`
- `docs/WORKFLOW.md`
