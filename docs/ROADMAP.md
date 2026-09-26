# Roadmap

The atlas is now a reader-facing research preview. The next work should deepen trust and coverage without making the interface feel like a dashboard again.

## Shipped in the current milestone

1. Reader-first shell with a compact global search and persistent spoiler-safe reading context.
2. Linked 3D neighborhood view, accessible system directory, sourced route lines, and replicant markers.
3. Story-time scrubber with play/pause, curated chapter jumps, event filters, and event-to-map focus.
4. Inspector tabs for system overview, story events, replicant cast, and source evidence.
5. Explicit first-reveal metadata for events, replicants, routes, and narrative star annotations.
6. Transit-aware world state and reduced-motion/WebGL-resilient rendering.
7. Workspace-wide tests including jsdom component tests, typechecking, provenance audit, referential-integrity validation, and CI.
8. Shareable URL state: deep links are validated before they are applied, and the query string tracks the live frame.

## Next milestone — trustworthy coverage

1. Replace TypeScript seed arrays with validated per-book content packages and a manifest loader.
2. Add fact-level locators (book/chapter or catalog identifier) to every narrative and astronomical record.
3. Curate the current 10 events, 6 boundaries, 5 identities, and 1 route against the primary novels; promote only reviewed records.
4. Add explicit coverage states for unmapped chapters, systems, and identity relationships instead of implying completeness.
5. Add local favorites/notes, and restore the reading frame on reload.

## Later product work

1. Character lineage graph and side-by-side story-year comparison.
2. Coverage matrix showing which chapters and systems are curated, provisional, or unmapped.
3. Camera bookmarks and optional authored route choreography.
4. Import/export for reader-maintained local notes without a backend.

## Quality gates

1. Keep `npm run check` green: lint, strict typecheck, tests, content audit, validation, and production build.
2. Preserve spoiler safety in tests whenever disclosure metadata changes.
3. Verify keyboard use, reduced motion, responsive layout, and the non-WebGL directory at each milestone.
4. Keep `main` releasable at each commit boundary.
