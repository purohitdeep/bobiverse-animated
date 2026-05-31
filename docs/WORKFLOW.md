# Workflow

## Branching

- Keep `main` releasable.
- Use short-lived branches for larger slices.

## Commits

- Use conventional commits: `type(scope): description`.
- Keep one concern per commit.
- Run relevant validation before committing.

## Standard Commit Sequence

1. `chore(repo): clean fresh-start baseline`
2. `docs(readme): tighten project overview`
3. `domain(types): add timeline content schemas`
4. `data(manifests): add multi-book content loading`
5. `ui(timeline): add reading-scope controls`