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
export const atlasSeriesManifest = SeriesManifestSchema.parse(rawSeriesManifest);
