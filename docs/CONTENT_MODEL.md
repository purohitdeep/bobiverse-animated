# Content Model

The atlas should be content-driven.

## Core Entities

- `Book` - release metadata and reading order
- `ChapterScope` - spoiler-safe timeline cutoffs
- `StarSystem` - canonical stellar coordinates and source confidence
- `BobInstance` - replicant identity, lineage, and lifecycle
- `TravelSegment` - departure, arrival, and route state
- `TimelineEvent` - dated story, tech, conflict, and movement events

## Provenance Standard

Every atlas fact should carry enough provenance to survive review.

1. `sourceIds` must identify one or more records in the knowledge-source catalog.
2. `reviewStatus` must state whether a fact is `canonical`, `verified`, `pending-review`, `disputed`, or `deprecated`.
3. `evidenceNote` should explain provisional or disputed facts when the source trail alone is not sufficient.
4. Books are the primary canon. Community timelines, fandom pages, and other secondary references may help discover or corroborate facts, but they do not become default truth without a primary-text review.

## Packaging Standard

1. Keep canonical shared entities in `packages/data`.
2. Group book-specific content through manifests.
3. Keep source records alongside content so each timeline fact can be audited.
4. Load data through schema validation before it reaches the renderer.

## Adding A New Book

1. Add book metadata and chapter scopes.
2. Add or reuse source records for the novel and any secondary corroboration.
3. Add new stars, Bobs, travel segments, and events as content files.
4. Register the new content in a manifest.
5. Rerun schema validation, provenance checks, and timeline tests.
