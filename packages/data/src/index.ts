import {
  BookSchema,
  BobInstanceSchema,
  ChapterScopeSchema,
  KnowledgeSourceSchema,
  SeriesManifestSchema,
  StarSystemSchema,
  TravelSegmentSchema,
  type Book,
  type BobInstance,
  type ChapterScope,
  type KnowledgeSource,
  type SeriesManifest,
  type StarSystem,
  type TravelSegment,
  TimelineEventSchema,
  type TimelineEvent,
} from "@bobiverse/domain";

function assertKnownSources(
  label: string,
  records: Array<{ id: string; sourceIds: string[] }>,
  knownSourceIds: Set<string>,
) {
  for (const record of records) {
    const unknownSourceIds = record.sourceIds.filter(
      (sourceId) => !knownSourceIds.has(sourceId),
    );

    if (unknownSourceIds.length > 0) {
      throw new Error(
        `${label} ${record.id} references unknown source ids: ${unknownSourceIds.join(
          ", ",
        )}`,
      );
    }
  }
}

const rawStarSystems = [
  {
    id: "sol",
    name: "Sol",
    raHours: 0,
    decDegrees: 0,
    distanceLy: 0,
    sourceType: "catalog",
    spectralType: "G2V",
    colorIndexBv: 0.65,
    visualMagnitude: -26.74,
    note: "Origin point for the interstellar neighborhood model.",
    evidenceNote:
      "Solar photometry uses the standard adopted solar constants (V = -26.74, B-V = 0.65); SIMBAD has no entry for the Sun, so these were not queried from the catalog.",
    sourceIds: ["simbad-catalog"],
    reviewStatus: "verified",
  },
  {
    id: "epsilon-eridani",
    name: "Epsilon Eridani",
    raHours: 3.55,
    decDegrees: -9.46,
    distanceLy: 10.5,
    sourceType: "catalog",
    spectralType: "K2V",
    colorIndexBv: 0.88,
    visualMagnitude: 3.73,
    parallaxMas: 310.5773,
    sourceIds: ["simbad-catalog"],
    reviewStatus: "verified",
  },
  {
    id: "delta-eridani",
    name: "Delta Eridani",
    raHours: 3.72,
    decDegrees: -9.76,
    distanceLy: 29.5,
    sourceType: "catalog",
    spectralType: "K0+IV",
    colorIndexBv: 0.92,
    visualMagnitude: 3.54,
    parallaxMas: 110.0254,
    sourceIds: ["simbad-catalog"],
    reviewStatus: "verified",
  },
  {
    id: "omicron2-eridani",
    name: "Omicron2 Eridani",
    raHours: 4.26,
    decDegrees: -7.65,
    distanceLy: 16.45,
    sourceType: "catalog",
    spectralType: "K0V",
    colorIndexBv: 0.82,
    visualMagnitude: 4.43,
    parallaxMas: 199.608,
    sourceIds: ["simbad-catalog"],
    reviewStatus: "verified",
  },
  {
    id: "alpha-centauri",
    name: "Alpha Centauri",
    raHours: 14.66,
    decDegrees: -60.83,
    distanceLy: 4.39,
    sourceType: "catalog",
    spectralType: "G2V+K1V",
    colorIndexBv: 0.5,
    visualMagnitude: -0.1,
    parallaxMas: 750.81,
    sourceIds: ["simbad-catalog"],
    reviewStatus: "verified",
  },
  {
    id: "delta-pavonis",
    name: "Delta Pavonis",
    raHours: 20.14547,
    decDegrees: -66.18206,
    distanceLy: 19.89,
    sourceType: "catalog",
    spectralType: "G8IV",
    colorIndexBv: 0.76,
    visualMagnitude: 3.56,
    parallaxMas: 163.9544,
    note: "Primary conflict system of the Others war in Books 2-3.",
    noteScopeId: "book-2-others-reveal",
    sourceIds: ["simbad-catalog"],
    reviewStatus: "verified",
  },
  {
    id: "82-eridani",
    name: "82 Eridani",
    raHours: 3.33,
    decDegrees: -43.07,
    distanceLy: 19.76,
    sourceType: "catalog",
    spectralType: "G6V",
    colorIndexBv: 0.71,
    visualMagnitude: 4.27,
    parallaxMas: 165.5242,
    sourceIds: ["simbad-catalog"],
    reviewStatus: "verified",
  },
] satisfies StarSystem[];

const rawKnowledgeSources = [
  {
    id: "we-are-legion-novel",
    label: "We Are Legion (We Are Bob)",
    href: "https://www.goodreads.com/book/show/32109569-we-are-legion-we-are-bob",
    type: "novel",
    authority: "primary",
    scope: "Book 1",
    author: "Dennis E. Taylor",
    publishedYear: 2016,
    note: "Primary canon for Book 1 timeline facts.",
  },
  {
    id: "for-we-are-many-novel",
    label: "For We Are Many",
    href: "https://www.goodreads.com/book/show/33395557-for-we-are-many",
    type: "novel",
    authority: "primary",
    scope: "Book 2",
    author: "Dennis E. Taylor",
    publishedYear: 2017,
    note: "Primary canon for Book 2 timeline facts.",
  },
  {
    id: "all-these-worlds-novel",
    label: "All These Worlds",
    href: "https://www.goodreads.com/book/show/35506021-all-these-worlds",
    type: "novel",
    authority: "primary",
    scope: "Book 3",
    author: "Dennis E. Taylor",
    publishedYear: 2017,
    note: "Primary canon for Book 3 timeline facts.",
  },
  {
    id: "simbad-catalog",
    label: "SIMBAD Astronomical Database",
    href: "https://simbad.cds.unistra.fr/simbad/",
    type: "catalog",
    authority: "reference",
    accessedOn: "2026-09-26",
    note: "Reference catalog for local stellar coordinates used in the seed map. Spectral type, parallax, and V/B photometry were retrieved per star via the SIMBAD TAP sync service.",
  },
  {
    id: "timeline-books-1-2",
    label: "Bobiverse Timeline Books 1-2",
    href: "https://pastebin.com/ZcKub4Fc",
    type: "timeline-reference",
    authority: "secondary",
    scope: "Books 1-2",
    note: "Secondary timeline summary used only as corroboration during curation.",
  },
  {
    id: "timeline-books-1-3",
    label: "Bobiverse Timeline Books 1-3",
    href: "https://pastebin.com/qwfY3PMU",
    type: "timeline-reference",
    authority: "secondary",
    scope: "Books 1-3",
    note: "Secondary timeline summary used only as corroboration during curation.",
  },
  {
    id: "bobiverse-wiki",
    label: "Bobiverse Wiki",
    href: "https://bobiverse.fandom.com/wiki/Bobiverse_Wiki",
    type: "fandom",
    authority: "secondary",
    note: "Secondary discovery aid; not authoritative without primary-text review.",
  },
] satisfies KnowledgeSource[];

const rawBooks = [
  {
    id: "we-are-legion",
    order: 1,
    title: "We Are Legion (We Are Bob)",
    shortTitle: "Book 1",
    chapterCount: 61,
    timelineStartYear: 2133,
    timelineEndYear: 2188.9,
    sourceIds: ["we-are-legion-novel"],
    reviewStatus: "canonical",
  },
  {
    id: "for-we-are-many",
    order: 2,
    title: "For We Are Many",
    shortTitle: "Book 2",
    chapterCount: 77,
    timelineStartYear: 2167,
    timelineEndYear: 2221.5,
    sourceIds: ["for-we-are-many-novel"],
    reviewStatus: "canonical",
  },
  {
    id: "all-these-worlds",
    order: 3,
    title: "All These Worlds",
    shortTitle: "Book 3",
    chapterCount: 76,
    timelineStartYear: 2212,
    timelineEndYear: 2263.9,
    sourceIds: ["all-these-worlds-novel"],
    reviewStatus: "canonical",
  },
] satisfies Book[];

const rawChapterScopes = [
  {
    id: "book-1-arrival-epsilon-eridani",
    bookId: "we-are-legion",
    chapter: 14,
    label: "Book 1 · Chapter 14",
    maxYear: 2144.6,
    sourceIds: ["we-are-legion-novel", "timeline-books-1-3"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Spoiler boundary is an atlas curation cutoff and still needs page-level verification.",
  },
  {
    id: "book-1-finale",
    bookId: "we-are-legion",
    chapter: 61,
    label: "Book 1 · Chapter 61",
    maxYear: 2188.9,
    sourceIds: ["we-are-legion-novel", "timeline-books-1-3"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Book finale cutoff is curated from timeline notes and requires primary-text verification.",
  },
  {
    id: "book-2-others-reveal",
    bookId: "for-we-are-many",
    chapter: 39,
    label: "Book 2 · Chapter 39",
    maxYear: 2188.7,
    sourceIds: ["for-we-are-many-novel", "timeline-books-1-3"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Chapter cutoff remains provisional until the novel pass confirms the year boundary.",
  },
  {
    id: "book-2-finale",
    bookId: "for-we-are-many",
    chapter: 77,
    label: "Book 2 · Chapter 77",
    maxYear: 2221.5,
    sourceIds: ["for-we-are-many-novel", "timeline-books-1-3"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Book finale cutoff remains provisional until the novel pass confirms the year boundary.",
  },
  {
    id: "book-3-bridget-replicated",
    bookId: "all-these-worlds",
    chapter: 41,
    label: "Book 3 · Chapter 41",
    maxYear: 2220.8,
    sourceIds: ["all-these-worlds-novel", "timeline-books-1-3"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Chapter cutoff remains provisional until the Book 3 source review is complete.",
  },
  {
    id: "book-3-finale",
    bookId: "all-these-worlds",
    chapter: 76,
    label: "Book 3 · Chapter 76",
    maxYear: 2263.9,
    sourceIds: ["all-these-worlds-novel", "timeline-books-1-3"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Book finale cutoff remains provisional until the Book 3 source review is complete.",
  },
] satisfies ChapterScope[];

const rawSeriesManifest = {
  id: "books-1-3-core",
  label: "Books 1-3 Core Timeline",
  bookIds: rawBooks.map((book) => book.id),
  chapterScopeIds: rawChapterScopes.map((scope) => scope.id),
  sourceIds: rawKnowledgeSources.map((source) => source.id),
} satisfies SeriesManifest;

const rawTimelineEvents = [
  {
    id: "bob-online",
    bookId: "we-are-legion",
    type: "narrative",
    label: "Bob comes online as a replicant.",
    year: 2133.5,
    chapterScopeId: "book-1-arrival-epsilon-eridani",
    starSystemId: "sol",
    bobIds: ["bob"],
    sourceIds: ["we-are-legion-novel", "timeline-books-1-2"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Seed event retained for UI development and must be verified against Book 1 before promotion.",
  },
  {
    id: "bob-launch",
    bookId: "we-are-legion",
    type: "departure",
    label: "Bob launches from Sol aboard HEAVEN-1.",
    year: 2133.6,
    chapterScopeId: "book-1-arrival-epsilon-eridani",
    starSystemId: "sol",
    bobIds: ["bob"],
    sourceIds: ["we-are-legion-novel", "timeline-books-1-2"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Seed event retained for UI development and must be verified against Book 1 before promotion.",
  },
  {
    id: "bob-arrives-epsilon-eridani",
    bookId: "we-are-legion",
    type: "arrival",
    label: "Bob arrives at Epsilon Eridani and begins local expansion.",
    year: 2144.6,
    chapterScopeId: "book-1-arrival-epsilon-eridani",
    starSystemId: "epsilon-eridani",
    bobIds: ["bob"],
    sourceIds: ["we-are-legion-novel", "timeline-books-1-2"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Arrival year is provisional until the primary-text review confirms the cutoff.",
  },
  {
    id: "first-bobmoot",
    bookId: "we-are-legion",
    type: "technology",
    label: "The first Bobmoot formalizes a shared strategic network.",
    year: 2172.5,
    chapterScopeId: "book-1-finale",
    bobIds: ["bob", "bill", "riker"],
    sourceIds: ["we-are-legion-novel", "timeline-books-1-3"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Bobmoot timing is provisional until the primary-text review confirms the event year.",
  },
  {
    id: "poseidon-discovered",
    bookId: "for-we-are-many",
    type: "narrative",
    label: "Mulder discovers Poseidon, expanding the colonization map.",
    year: 2170.9,
    chapterScopeId: "book-2-others-reveal",
    bobIds: ["mulder"],
    sourceIds: [
      "for-we-are-many-novel",
      "timeline-books-1-3",
      "bobiverse-wiki",
    ],
    reviewStatus: "pending-review",
    evidenceNote:
      "Poseidon discovery date currently relies on secondary summaries pending a Book 2 verification pass.",
  },
  {
    id: "others-discovered",
    bookId: "for-we-are-many",
    type: "conflict",
    label: "The Others become an explicit strategic threat.",
    year: 2188.5,
    chapterScopeId: "book-2-others-reveal",
    bobIds: [],
    sourceIds: [
      "for-we-are-many-novel",
      "timeline-books-1-3",
      "bobiverse-wiki",
    ],
    reviewStatus: "pending-review",
    evidenceNote:
      "Threat emergence date is provisional until the Book 2 verification pass is complete.",
  },
  {
    id: "battle-delta-pavonis",
    bookId: "for-we-are-many",
    type: "conflict",
    label: "The Battle of Delta Pavonis changes the balance with the Others.",
    year: 2217.3,
    chapterScopeId: "book-2-finale",
    starSystemId: "delta-pavonis",
    bobIds: [],
    sourceIds: ["for-we-are-many-novel", "timeline-books-1-3"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Battle date is provisional until the primary-text review confirms the timeline placement.",
  },
  {
    id: "bridget-replicated",
    bookId: "all-these-worlds",
    type: "replicant-created",
    label:
      "Bridget becomes a replicant, shifting the social fabric of the Bobs.",
    year: 2220.8,
    chapterScopeId: "book-3-bridget-replicated",
    bobIds: ["bridget-r"],
    sourceIds: [
      "all-these-worlds-novel",
      "timeline-books-1-3",
      "bobiverse-wiki",
    ],
    reviewStatus: "pending-review",
    evidenceNote:
      "Replication timing remains provisional until the Book 3 verification pass is complete.",
  },
  {
    id: "battle-of-sol",
    bookId: "all-these-worlds",
    type: "conflict",
    label: "The Battle of Sol becomes the defining late-war confrontation.",
    year: 2257.4,
    chapterScopeId: "book-3-finale",
    starSystemId: "sol",
    bobIds: [],
    sourceIds: [
      "all-these-worlds-novel",
      "timeline-books-1-3",
      "bobiverse-wiki",
    ],
    reviewStatus: "pending-review",
    evidenceNote:
      "Battle date remains provisional until the Book 3 verification pass is complete.",
  },
  {
    id: "bob-pilgrimage",
    bookId: "all-these-worlds",
    type: "narrative",
    label: "Bob returns to Earth, then leaves for the stars again.",
    year: 2263.8,
    chapterScopeId: "book-3-finale",
    starSystemId: "sol",
    bobIds: ["bob"],
    sourceIds: ["all-these-worlds-novel", "timeline-books-1-3"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Seed event retained for UI development and must be verified against Book 3 before promotion.",
  },
] satisfies TimelineEvent[];

export const knowledgeSources = rawKnowledgeSources.map((source) =>
  KnowledgeSourceSchema.parse(source),
);

const knownSourceIds = new Set(knowledgeSources.map((source) => source.id));

export const seedStarSystems = rawStarSystems.map((star) =>
  StarSystemSchema.parse(star),
);
assertKnownSources("star system", seedStarSystems, knownSourceIds);

export const atlasBooks = rawBooks.map((book) => BookSchema.parse(book));
assertKnownSources("book", atlasBooks, knownSourceIds);

export const atlasChapterScopes = rawChapterScopes.map((scope) =>
  ChapterScopeSchema.parse(scope),
);
assertKnownSources("chapter scope", atlasChapterScopes, knownSourceIds);

export const atlasSeriesManifest =
  SeriesManifestSchema.parse(rawSeriesManifest);
assertKnownSources(
  "series manifest",
  [{ id: atlasSeriesManifest.id, sourceIds: atlasSeriesManifest.sourceIds }],
  knownSourceIds,
);

export const atlasTimelineEvents = rawTimelineEvents.map((event) =>
  TimelineEventSchema.parse(event),
);
assertKnownSources("timeline event", atlasTimelineEvents, knownSourceIds);

const rawBobInstances = [
  {
    id: "bob",
    name: "Bob",
    generation: 0,
    introducedInBookId: "we-are-legion",
    revealedInScopeId: "book-1-arrival-epsilon-eridani",
    createdYear: 2133.5,
    homeSystemId: "sol",
    sourceIds: ["we-are-legion-novel", "timeline-books-1-2"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Identity and origin retained for UI development pending the Book 1 primary-text review.",
  },
  {
    id: "bill",
    name: "Bill",
    generation: 1,
    introducedInBookId: "we-are-legion",
    revealedInScopeId: "book-1-arrival-epsilon-eridani",
    createdYear: 2144.6,
    homeSystemId: "epsilon-eridani",
    parentId: "bob",
    sourceIds: ["we-are-legion-novel", "timeline-books-1-3"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Identity, lineage, and replication date pending the Book 1 primary-text review.",
  },
  {
    id: "riker",
    name: "Riker",
    generation: 1,
    introducedInBookId: "we-are-legion",
    revealedInScopeId: "book-1-arrival-epsilon-eridani",
    createdYear: 2144.8,
    homeSystemId: "delta-eridani",
    parentId: "bob",
    sourceIds: ["we-are-legion-novel", "timeline-books-1-3"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Identity, lineage, and replication date pending the Book 1 primary-text review.",
  },
  {
    id: "mulder",
    name: "Mulder",
    generation: 2,
    introducedInBookId: "for-we-are-many",
    revealedInScopeId: "book-2-others-reveal",
    createdYear: 2170.5,
    homeSystemId: "82-eridani",
    parentId: "bob",
    sourceIds: ["for-we-are-many-novel", "timeline-books-1-3"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Identity and Poseidon discovery context pending the Book 2 primary-text review.",
  },
  {
    id: "bridget-r",
    name: "Bridget R",
    generation: 1,
    introducedInBookId: "all-these-worlds",
    revealedInScopeId: "book-3-bridget-replicated",
    createdYear: 2220.8,
    homeSystemId: "sol",
    sourceIds: ["all-these-worlds-novel", "timeline-books-1-3"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Replication timing and origin pending the Book 3 primary-text review.",
  },
] satisfies BobInstance[];

const rawTravelSegments = [
  {
    id: "bob-sol-to-epsilon-eridani",
    bobId: "bob",
    bookId: "we-are-legion",
    revealedInScopeId: "book-1-arrival-epsilon-eridani",
    fromSystemId: "sol",
    toSystemId: "epsilon-eridani",
    departureYear: 2133.6,
    arrivalYear: 2144.6,
    sourceIds: ["we-are-legion-novel", "timeline-books-1-2"],
    reviewStatus: "pending-review",
    evidenceNote:
      "Seed route retained for movement UI development pending the Book 1 primary-text review.",
  },
] satisfies TravelSegment[];

export const atlasBobInstances = rawBobInstances.map((bob) =>
  BobInstanceSchema.parse(bob),
);
assertKnownSources("bob instance", atlasBobInstances, knownSourceIds);

export const atlasTravelSegments = rawTravelSegments.map((segment) =>
  TravelSegmentSchema.parse(segment),
);
assertKnownSources("travel segment", atlasTravelSegments, knownSourceIds);
