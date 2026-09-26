# Sources

The atlas uses a source hierarchy so timeline data can be trusted and audited.

## Authority Order

1. Primary canon: the published Bobiverse novels.
2. Secondary corroboration: curated timeline summaries and fandom references.
3. Reference material: astronomical catalogs and similar non-narrative lookup sources.

Secondary sources are allowed to help discover candidate facts or corroborate sequence, but they do not become accepted atlas truth without a primary-text review.

## Review States

- `canonical` - confirmed directly from primary canon.
- `verified` - confirmed from a trusted reference source such as a catalog.
- `pending-review` - usable for development, but not yet promoted to trusted canon.
- `disputed` - conflicting evidence exists and the record must stay flagged.
- `deprecated` - retained for history or migration, not current truth.

## Curation Rules

1. Every atlas fact must reference at least one source record.
2. Every provisional or disputed fact should carry an `evidenceNote` describing why it is not yet canonical.
3. Facts without a stable source trail must not be promoted beyond `pending-review`.
4. Books 1-3 should be reviewed against the novels before the seed dataset is treated as trustworthy.
5. Fandom entries may support discovery and cross-checking, but they are never sufficient on their own for canonical promotion.

## Implementation Standard

1. Keep the knowledge-source catalog in the data layer.
2. Fail validation when content references an unknown `sourceId`.
3. Audit provenance for stars, books, chapter scopes, events, replicants, and travel segments.
4. Require explicit first-reveal scope metadata for narrative events, identities, routes, and scoped star annotations.
5. Add stronger referential-integrity and timeline-consistency checks before expanding the dataset.
6. Warn readers that secondary links can contain spoilers beyond the selected frontier.
