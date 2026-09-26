# Bobiverse Atlas: Current Review Plan

## Current baseline

The app is a local, content-driven research preview for Books 1–3. It has a reader-facing atlas shell, explicit reading frontier, story-time controls, a 3D scene, an accessible directory, linked event selection, and a provenance-aware inspector.

The committed seed set currently contains 3 books, 6 curated chapter boundaries, 7 star systems, 10 timeline events, 5 replicants, and 1 travel segment. All 10 timeline events and all 6 chapter boundaries remain `pending-review`; the UI labels this state rather than presenting the seed set as finished canon.

## What the current quality gate proves

- Workspace lint and strict TypeScript checks pass.
- Simulation and content unit tests pass.
- Provenance audit covers stars, books, chapter scopes, events, replicants, and travel segments.
- Referential validation checks IDs, source references, manifest membership, reveal scopes, system coordinates, lineage references, and travel ordering.
- Production build succeeds.

The gate does **not** prove primary-text accuracy, arbitrary chapter coverage, or that external secondary sources are spoiler-safe. Those limitations are surfaced in the interface and remain content-review work.

## Highest-priority follow-up

1. **Primary-source review:** replace whole-novel links with fact-level chapter/page locators and promote only records reviewed against the novels.
2. **Content packaging:** move the in-code seed arrays into validated per-book packages without changing UI code.
3. **Coverage honesty:** add a coverage matrix for every chapter, system, identity, and route; distinguish `curated`, `provisional`, and `unmapped` rather than using a single mapped count.
4. **Disclosure model:** keep first-reveal metadata mandatory and test later-chapter/earlier-year fixtures for every narrative entity type.
5. **Reader continuity:** add URL-deep-linked view state, previous/next event navigation, and local favorites/notes.

## Product acceptance checklist

- A fresh load shows a meaningful story frame, an explicit reading frontier, and the current evidence status.
- Selecting a book, chapter boundary, year, system, replicant, or event updates the same world frame everywhere it is represented.
- In-transit replicants are labeled with route and progress rather than being reported as stationary.
- Later-scope events, identities, routes, and narrative annotations are absent from the visible experience.
- The directory remains useful when WebGL or the 3D scene fails.
- Keyboard focus, reduced motion, mobile layout, and source-link warnings are checked before release.
