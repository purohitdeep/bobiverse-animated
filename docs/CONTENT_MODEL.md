# Content Model

The atlas should be content-driven.

## Core Entities

- `Book` - release metadata and reading order
- `ChapterScope` - spoiler-safe timeline cutoffs
- `StarSystem` - canonical stellar coordinates and source confidence
- `BobInstance` - replicant identity, lineage, and lifecycle
- `TravelSegment` - departure, arrival, and route state
- `TimelineEvent` - dated story, tech, conflict, and movement events

## Packaging Standard

1. Keep canonical shared entities in `packages/data`.
2. Group book-specific content through manifests.
3. Load data through schema validation before it reaches the renderer.

## Adding A New Book

1. Add book metadata and chapter scopes.
2. Add new stars, Bobs, travel segments, and events as content files.
3. Register the new content in a manifest.
4. Rerun validation and timeline tests.