# Bobiverse Atlas: Review and Implementation Plan

## Scope and baseline

Reviewed the README, project documentation, domain schemas, seed data and audit, simulation helpers, application state and UI components, and build configuration. This is a plan, not an implementation change. Existing uncommitted changes were present and were not reverted.

The project is beyond the foundation described in the [README](../README.md#L5): an editorial layout, scope controls, timeline queries, provenance badges, and a content audit already exist. The next milestone should make those foundations reliable before expanding the scene or dataset.

### Validation performed

- `npm run check` passed: frontend lint, frontend typecheck, content audit, and production build.
- Audit: 25 records, 7 sources; 3 canonical, 6 verified, and 16 pending review. All 10 events and all 6 chapter scopes are pending review.
- Standalone strict TypeScript checks passed for domain but failed for data and simulation.
- Production JavaScript bundle: approximately 1.19 MB minified / 331 KB gzip; Vite emitted a large-chunk warning.
- Isolated in-memory probes confirmed that a later-chapter event with an earlier year is visible at an earlier chapter boundary, and dangling book/system/scope/Bob references produce no audit errors. No seed files were changed by these probes.
- Empty timeline input returns `Infinity` / `-Infinity` bounds.
- No browser visual, device, or assistive-technology verification was performed. Visual and accessibility recommendations require follow-up testing.

## Priority findings

### P0 — Reading boundaries are not actually chapter-safe

[Scoped event filtering](../packages/simulation/src/index.ts#L153-L183) checks book order and year, but never uses an event's `chapterScopeId`. Story chronology and reader knowledge are different: a later chapter can reveal an earlier event. The [UI promises spoiler safety](../apps/web/src/components/ScopeSelector.tsx#L24-L28) that this query cannot enforce.

The [initial state](../apps/web/src/store/useStarMapStore.ts#L14-L18) selects Book 3's finale, and [changing books](../apps/web/src/App.tsx#L86-L98) also selects that book's final boundary. The event log renders future-within-scope labels, so the early initial focal year does not prevent disclosure. Only two curated chapter boundaries per book exist, not arbitrary chapter support.

### P1 — The green check does not cover the intended strictness

[Root validation](../package.json#L10-L16) runs lint/typecheck only in the web workspace. The [web TypeScript configuration](../apps/web/tsconfig.app.json#L1-L25) does not extend the [strict shared configuration](../tsconfig.base.json#L1-L13). Imported package code is therefore checked under different options, and audit-only modules are outside the web import graph.

Standalone package checks found:

- Data: explicit `.ts` imports lack the corresponding compiler option; Node console types are missing; the audit's optional `evidenceNote` type conflicts with Zod-inferred types under `exactOptionalPropertyTypes`.
- Simulation: palette indexing produces `string | undefined` under `noUncheckedIndexedAccess`, conflicting with `SceneStarNode.color`.

There is no test script in the workspace manifests and no repository CI configuration was found. The README also does not specify a supported Node version despite Vite and the type-stripping audit command having runtime requirements.

### P1 — Validation checks provenance, not full content integrity

The [loader](../packages/data/src/index.ts#L439-L469) parses schemas and rejects unknown source IDs. The [audit](../packages/data/src/audit.ts#L192-L221) checks review-state/source-authority rules. Neither provides comprehensive duplicate-ID, foreign-key, manifest-membership, lineage, or timeline checks.

Concrete seed inconsistency: the [Battle of Delta Pavonis event](../packages/data/src/index.ts#L374-L385) points to `delta-eridani`. This needs source review, not an unsupported replacement coordinate. Events reference Bob IDs, but no Bob collection is loaded.

The [schemas](../packages/domain/src/index.ts#L37-L113) also lack RA/declination bounds and chronological ordering refinements for books and travel. Source catalog entries lack structured fact-level chapter/page/catalog locators; merely citing a novel does not establish that a claim was checked.

### P1 — The core movement feature is not implemented

[Bob and travel schemas](../packages/domain/src/index.ts#L81-L101) exist, but there are no corresponding seed collections or movement queries. The [scene lines](../apps/web/src/components/StarfieldScene.tsx#L89-L103) connect every non-Sol star to the origin; they are not sourced travel routes. The [scene inputs](../apps/web/src/App.tsx#L218-L223) contain neither focal year nor reading scope. The timeline currently changes the event dossier, not the simulated world.

### P2 — Content packaging is only a scaffold

The [data module](../packages/data/src/index.ts#L36-L437) embeds all content in one TypeScript file. The manifest is generated from those arrays and does not select book content files, events, Bobs, or routes. New-book support still needs the validated content-package loader described in the [content model](CONTENT_MODEL.md#L23-L36).

### P2 — Usability and resilience need a deliberate pass

- The [book selector](../apps/web/src/components/ScopeSelector.tsx#L30-L45) declares a tablist but contains ordinary buttons without tab semantics; use a button group with selected state or implement the full tabs pattern.
- [Star-selection buttons](../apps/web/src/App.tsx#L202-L214) convey selection through CSS rather than an explicit accessible state.
- [Timeline markers](../apps/web/src/components/TimelineSlider.tsx#L42-L59) include scopes beyond the selected bound and clamp them to the endpoint, creating misleading overlapping markers.
- [App fallbacks](../apps/web/src/App.tsx#L53-L63) silently render nothing without a scope and assume at least one star later in rendering. The [timeline bounds helper](../packages/simulation/src/index.ts#L82-L92) has no empty-input contract.
- The [Canvas](../apps/web/src/components/StarfieldScene.tsx#L60-L87) has no application-provided WebGL fallback or reduced-motion preference handling.
- Event-to-system navigation, search, playback, camera focus/reset, and shareable state remain product enhancements rather than existing features.
- Static data transformations run again on slider updates; optimize after correctness and measurement, not by adding blanket memoization.

## Implementation sequence

### Phase 1 — Make quality gates trustworthy

1. Add package-level typecheck scripts and make the root command check every package with its actual configuration.
2. Align web strictness with the shared baseline; fix audit typing/runtime configuration and palette indexing without weakening strictness.
3. Extend lint coverage to shared packages and Node scripts.
4. Add a unit-test runner, CI using `npm ci`, and a documented/pinned supported Node version.
5. Add initial tests for coordinate axes/distance, empty bounds, clamping, and the confirmed scope/audit gaps. Land failing-case tests alongside their fixes rather than leaving main red.

**Acceptance:** one documented command passes lint, strict checking across all packages, tests, content audit, and build in CI. Intentionally introducing an error in an audit-only module fails that command.

### Phase 2 — Establish reliable reader scope and content contracts

1. Model first disclosure separately from event year, using book order plus chapter or a validated curated reveal boundary.
2. Require or explicitly quarantine unscoped narrative records. Apply one visibility policy to events, identities, narrative system details, and routes; keep public astronomical reference facts distinct.
3. Default to a safe onboarding/reading-position state; changing books must not silently select the finale. Label coarse curated coverage honestly until chapter-by-chapter coverage exists.
4. Centralize atomic state transitions for book, chapter, and focal year, with validated bounds and safe fallbacks.
5. Build a pure `validateAtlas(content)` pipeline that returns structured findings before rendering: duplicate IDs/orders, every foreign key, same-book scope relationships, manifest membership, coordinate bounds, and meaningful date constraints.
6. Resolve the Delta Pavonis/Delta Eridani mismatch through evidence review or quarantine it; add Bob identity records or keep unresolved identity links explicitly flagged.

**Acceptance:** later-revealed earlier-year events are hidden; earlier books and overlapping story timelines have explicit tested behavior; malformed references fail validation with record IDs; book switching cannot expose a finale without user intent. Do not assume all story dates increase with chapter order.

### Phase 3 — Deliver validated content packages and evidence

1. Split source catalog, shared systems, and per-book content into data files with explicit manifests and a single validated loader.
2. Include events, identities, routes, and disclosure metadata in package selection, not just books and scopes.
3. Add structured citation locators and review metadata appropriate to novels and catalog measurements. Keep provisional claims visibly provisional.
4. Curate existing events and reading boundaries before adding more books. Primary-text access and human review are dependencies; do not auto-promote claims because a primary source ID is present.
5. Show source/review details for systems and scope boundaries as well as events. Warn users that outbound secondary references may contain spoilers beyond their selected scope.

**Acceptance:** a fixture book can be added without changing UI logic; invalid packages fail with actionable findings; every trusted fact has reviewable evidence; default UI never presents deprecated or disputed content as unqualified truth.

### Phase 4 — Implement a small, genuine movement slice

1. Add sourced Bob lifecycle/lineage and travel records, with temporal and referential checks.
2. Implement deterministic world-state queries for pre-departure, transit, arrival, and location, filtered through the reader boundary.
3. Document the visual interpolation model rather than implying physical accuracy that the data does not support.
4. Replace or label decorative spokes; render actual routes and replicant markers, and connect event selection to year/system focus.
5. Add play/pause, speed control, and camera focus/reset after the state model is tested.

**Acceptance:** one reviewed journey works end to end when scrubbing forward or backward; routes never reveal hidden destinations; departure and arrival boundaries and invalid overlapping travel are covered by tests.

### Phase 5 — Harden the experience and reconcile documentation

1. Correct selection semantics and keyboard behavior; test focus visibility, mobile layouts, and reduced motion.
2. Add empty-data states, error boundaries, a WebGL-unavailable fallback, and a useful non-3D system/event view.
3. Hide out-of-range timeline markers instead of clamping them; standardize decimal-year formatting and add event navigation/search as needed.
4. Measure loading and slider interaction; lazy-load the 3D scene, establish bundle/frame budgets, and optimize static derivations only where useful.
5. Add browser smoke tests for scope switching, selection, timeline interaction, empty data, and fallback rendering.
6. Update the README and roadmap to distinguish implemented capabilities, curated coverage, known limitations, and planned features. Document audit/test commands, runtime requirements, coordinate conventions, and content contribution/review steps.

**Acceptance:** keyboard-only use and supported mobile sizes pass a manual/browser-test checklist; meaningful content survives missing WebGL or data errors; measured performance meets an agreed budget; documentation matches shipped behavior.

## Recommended first milestone

Complete Phases 1 and 2 before investing in more stars, another visual redesign, or additional books. They address the largest trust risks: a misleading green quality gate, a chapter-safety promise the query does not enforce, and content inconsistencies the audit cannot detect. Then build one evidence-backed movement slice rather than expanding unverified seed content.
