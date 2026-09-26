# Workflow

## Branching

- Keep `main` releasable.
- Use short-lived branches for larger slices.

## Quality loop

1. Make one reader-facing or data-contract change.
2. Add or update focused tests for scope, chronology, movement, and provenance behavior.
3. Run `npm run check` before committing.
4. Review the desktop and narrow layouts, including the non-WebGL directory and reduced-motion state.
5. Commit with a conventional message: `type(scope): description`.

## Content changes

- Treat novels as primary canon and keep provisional claims visibly flagged.
- Add explicit first-reveal scope metadata to every narrative record.
- Keep public astronomical coordinates separate from scoped narrative annotations.
- Update the source catalog and run the content audit with the data change.
- Do not expand arbitrary chapter support until chapter-level content and locators exist.

## Standard commit sequence for a milestone

1. `domain(types): make the reader/content contract explicit`
2. `data(content): add validated records and provenance`
3. `simulation(world): derive the shared reader frame`
4. `ui(atlas): connect the reader experience`
5. `test(quality): cover scope, movement, and fallback behavior`
6. `docs(readme): reconcile shipped coverage and limitations`
