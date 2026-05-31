import {
  BookSchema,
  ChapterScopeSchema,
  KnowledgeSourceSchema,
  SeriesManifestSchema,
  StarSystemSchema,
  type Book,
  type ChapterScope,
  type KnowledgeSource,
  type SeriesManifest,
  type StarSystem,
  TimelineEventSchema,
  type TimelineEvent,
} from "@bobiverse/domain";

const rawStarSystems = [
  {
    id: "sol",
    name: "Sol",
    raHours: 0,
    decDegrees: 0,
    distanceLy: 0,
    sourceType: "catalog",
    note: "Origin point for the interstellar neighborhood model.",
  },
  {
    id: "epsilon-eridani",
    name: "Epsilon Eridani",
    raHours: 3.55,
    decDegrees: -9.46,
    distanceLy: 10.5,
    sourceType: "catalog",
  },
  {
    id: "delta-eridani",
    name: "Delta Eridani",
    raHours: 3.72,
    decDegrees: -9.76,
    distanceLy: 29.5,
    sourceType: "catalog",
  },
  {
    id: "omicron2-eridani",
    name: "Omicron2 Eridani",
    raHours: 4.26,
    decDegrees: -7.65,
    distanceLy: 16.45,
    sourceType: "catalog",
  },
  {
    id: "alpha-centauri",
    name: "Alpha Centauri",
    raHours: 14.66,
    decDegrees: -60.83,
    distanceLy: 4.39,
    sourceType: "catalog",
  },
  {
    id: "82-eridani",
    name: "82 Eridani",
    raHours: 3.33,
    decDegrees: -43.07,
    distanceLy: 19.76,
    sourceType: "catalog",
  },
] satisfies StarSystem[];

const rawKnowledgeSources = [
  {
    id: "timeline-books-1-2",
    label: "Bobiverse Timeline Books 1-2",
    href: "https://pastebin.com/ZcKub4Fc",
  },
  {
    id: "timeline-books-1-3",
    label: "Bobiverse Timeline Books 1-3",
    href: "https://pastebin.com/qwfY3PMU",
  },
  {
    id: "bobiverse-wiki",
    label: "Bobiverse Wiki",
    href: "https://bobiverse.fandom.com/wiki/Bobiverse_Wiki",
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
  },
  {
    id: "for-we-are-many",
    order: 2,
    title: "For We Are Many",
    shortTitle: "Book 2",
    chapterCount: 77,
    timelineStartYear: 2167,
    timelineEndYear: 2221.5,
  },
  {
    id: "all-these-worlds",
    order: 3,
    title: "All These Worlds",
    shortTitle: "Book 3",
    chapterCount: 76,
    timelineStartYear: 2212,
    timelineEndYear: 2263.9,
  },
] satisfies Book[];

const rawChapterScopes = [
  {
    id: "book-1-arrival-epsilon-eridani",
    bookId: "we-are-legion",
    chapter: 14,
    label: "Book 1 · Chapter 14",
    maxYear: 2144.6,
  },
  {
    id: "book-1-finale",
    bookId: "we-are-legion",
    chapter: 61,
    label: "Book 1 · Chapter 61",
    maxYear: 2188.9,
  },
  {
    id: "book-2-others-reveal",
    bookId: "for-we-are-many",
    chapter: 39,
    label: "Book 2 · Chapter 39",
    maxYear: 2188.7,
  },
  {
    id: "book-2-finale",
    bookId: "for-we-are-many",
    chapter: 77,
    label: "Book 2 · Chapter 77",
    maxYear: 2221.5,
  },
  {
    id: "book-3-bridget-replicated",
    bookId: "all-these-worlds",
    chapter: 41,
    label: "Book 3 · Chapter 41",
    maxYear: 2220.8,
  },
  {
    id: "book-3-finale",
    bookId: "all-these-worlds",
    chapter: 76,
    label: "Book 3 · Chapter 76",
    maxYear: 2263.9,
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
  },
  {
    id: "first-bobmoot",
    bookId: "we-are-legion",
    type: "technology",
    label: "The first Bobmoot formalizes a shared strategic network.",
    year: 2172.5,
    chapterScopeId: "book-1-finale",
    bobIds: ["bob", "bill", "riker"],
  },
  {
    id: "poseidon-discovered",
    bookId: "for-we-are-many",
    type: "narrative",
    label: "Mulder discovers Poseidon, expanding the colonization map.",
    year: 2170.9,
    chapterScopeId: "book-2-others-reveal",
    bobIds: ["mulder"],
  },
  {
    id: "others-discovered",
    bookId: "for-we-are-many",
    type: "conflict",
    label: "The Others become an explicit strategic threat.",
    year: 2188.5,
    chapterScopeId: "book-2-others-reveal",
    bobIds: [],
  },
  {
    id: "battle-delta-pavonis",
    bookId: "for-we-are-many",
    type: "conflict",
    label: "The Battle of Delta Pavonis changes the balance with the Others.",
    year: 2217.3,
    chapterScopeId: "book-2-finale",
    starSystemId: "delta-eridani",
    bobIds: [],
  },
  {
    id: "bridget-replicated",
    bookId: "all-these-worlds",
    type: "replicant-created",
    label: "Bridget becomes a replicant, shifting the social fabric of the Bobs.",
    year: 2220.8,
    chapterScopeId: "book-3-bridget-replicated",
    bobIds: ["bridget-r"],
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
  },
] satisfies TimelineEvent[];

export const seedStarSystems = rawStarSystems.map((star) =>
  StarSystemSchema.parse(star),
);
export const knowledgeSources = rawKnowledgeSources.map((source) =>
  KnowledgeSourceSchema.parse(source),
);
export const atlasBooks = rawBooks.map((book) => BookSchema.parse(book));
export const atlasChapterScopes = rawChapterScopes.map((scope) =>
  ChapterScopeSchema.parse(scope),
);
export const atlasSeriesManifest =
  SeriesManifestSchema.parse(rawSeriesManifest);
export const atlasTimelineEvents = rawTimelineEvents.map((event) =>
  TimelineEventSchema.parse(event),
);
