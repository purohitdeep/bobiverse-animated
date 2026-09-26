# Content Model

The atlas should be content-driven.

## Core Entities

- `Book` - release metadata and reading order
- `ChapterScope` - spoiler-safe timeline cutoffs
- `StarSystem` - canonical stellar coordinates and source confidence
- `BobInstance` - replicant identity, lineage, lifecycle, and explicit first-reveal scope
- `TravelSegment` - departure, arrival, route state, and explicit first-reveal scope
- `TimelineEvent` - dated story, tech, conflict, and movement events with first-reveal scope

## Disclosure Contract

Story chronology and reader knowledge are separate. Every narrative entity must carry a `revealedInScopeId` (or an event's `chapterScopeId`) that defines when it may appear. Visibility must use that disclosure boundary first; it must not infer knowledge from the entity's year alone.

A star's public catalog coordinates are always safe reference material. Any narrative annotation on a star is scoped separately with `noteScopeId` and stays hidden until that scope is inside the reader's frontier.

Replicant world state is discriminated: `stationary`, `in-transit` (from, to, and progress), or `arrived`. A transit marker must never be presented as a stationary system resident.

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
