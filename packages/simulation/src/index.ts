import type {
  Book,
  ChapterScope,
  SeriesManifest,
  StarSystem,
  TimelineEvent,
} from "@bobiverse/domain";

export interface CartesianCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface SceneStarNode extends StarSystem {
  position: CartesianCoordinate;
  radius: number;
  color: string;
}

export interface TimelineBounds {
  startYear: number;
  endYear: number;
}

export interface TimelineEventState extends TimelineEvent {
  state: "past" | "active" | "future";
}

const STAR_COLORS: readonly [
  string,
  string,
  string,
  string,
  string,
  string,
] = [
  "#f7d06b",
  "#79d8ff",
  "#88f0b5",
  "#ffa26e",
  "#f0a6ff",
  "#c2d2ff",
];

export function toCartesianCoordinate(star: StarSystem): CartesianCoordinate {
  const rightAscension = star.raHours * (Math.PI / 12);
  const declination = star.decDegrees * (Math.PI / 180);
  const distance = star.distanceLy;

  return {
    x: distance * Math.cos(declination) * Math.cos(rightAscension),
    y: distance * Math.cos(declination) * Math.sin(rightAscension),
    z: distance * Math.sin(declination),
  };
}

export function buildSceneStarNodes(
  stars: StarSystem[],
  scale = 0.18,
): SceneStarNode[] {
  return stars.map((star, index) => {
    const base = toCartesianCoordinate(star);
    return {
      ...star,
      position: {
        x: base.x * scale,
        y: base.z * scale,
        z: base.y * scale,
      },
      radius: star.id === "sol" ? 0.22 : 0.12,
      color: STAR_COLORS[index % STAR_COLORS.length] ?? "#f7d06b",
    };
  });
}

export function getNeighborhoodSummary(stars: StarSystem[]) {
  const farthestStar = [...stars].sort(
    (left, right) => right.distanceLy - left.distanceLy,
  )[0];

  return {
    count: stars.length,
    farthestStar: farthestStar?.name ?? "Unknown",
    spanLy: farthestStar?.distanceLy ?? 0,
  };
}

export function getTimelineBounds(
  books: Book[],
  scopes: ChapterScope[],
): TimelineBounds {
  const startYears = books.map((book) => book.timelineStartYear);
  const endYears = scopes.map((scope) => scope.maxYear);
  return {
    startYear: Math.min(...startYears),
    endYear: Math.max(...endYears),
  };
}

export function getManifestBooks(books: Book[], manifest: SeriesManifest) {
  const includedBookIds = new Set(manifest.bookIds);
  return books.filter((book) => includedBookIds.has(book.id));
}

export function getManifestChapterScopes(
  scopes: ChapterScope[],
  manifest: SeriesManifest,
) {
  const includedScopeIds = new Set(manifest.chapterScopeIds);
  return scopes.filter((scope) => includedScopeIds.has(scope.id));
}

export function getBookChapterScopes(scopes: ChapterScope[], bookId: string) {
  return scopes
    .filter((scope) => scope.bookId === bookId)
    .sort((left, right) => left.chapter - right.chapter);
}

export function getChapterScopeById(
  scopes: ChapterScope[],
  chapterScopeId: string,
) {
  return scopes.find((scope) => scope.id === chapterScopeId) ?? null;
}

export function getBooksThroughSelection(
  books: Book[],
  selectedBookId: string,
) {
  const selectedBook = books.find((book) => book.id === selectedBookId);
  if (!selectedBook) {
    return [];
  }

  return books
    .filter((book) => book.order <= selectedBook.order)
    .sort((left, right) => left.order - right.order);
}

export function getScopeTimelineBounds(
  books: Book[],
  selectedScope: ChapterScope,
): TimelineBounds {
  const includedBooks = getBooksThroughSelection(books, selectedScope.bookId);
  const startYear = includedBooks.length
    ? Math.min(...includedBooks.map((book) => book.timelineStartYear))
    : selectedScope.maxYear;

  return {
    startYear,
    endYear: selectedScope.maxYear,
  };
}

export function clampYearToBounds(year: number, bounds: TimelineBounds) {
  return Math.min(Math.max(year, bounds.startYear), bounds.endYear);
}

export function getScopedTimelineEvents(
  events: TimelineEvent[],
  books: Book[],
  scopes: ChapterScope[],
  selectedScope: ChapterScope,
  focalYear: number,
): TimelineEventState[] {
  const selectedBook = books.find((book) => book.id === selectedScope.bookId);
  if (!selectedBook) {
    return [];
  }

  const bookOrderById = new Map(books.map((book) => [book.id, book.order]));
  const scopeById = new Map(scopes.map((scope) => [scope.id, scope]));

  const visibleEvents = events
    .filter((event) => {
      const eventBookOrder = bookOrderById.get(event.bookId);
      if (eventBookOrder === undefined || eventBookOrder > selectedBook.order) {
        return false;
      }

      // Unscoped events have no reveal boundary yet and stay hidden until
      // they are curated with a chapter scope.
      if (!event.chapterScopeId) {
        return false;
      }

      const eventScope = scopeById.get(event.chapterScopeId);
      if (!eventScope) {
        return false;
      }

      const eventScopeBookOrder = bookOrderById.get(eventScope.bookId);
      if (eventScopeBookOrder === undefined) {
        return false;
      }

      // Revealed in an earlier book: inside the reading frontier.
      if (eventScopeBookOrder < selectedBook.order) {
        return true;
      }

      // Same book: revealed at or before the selected chapter boundary.
      return eventScope.chapter <= selectedScope.chapter;
    })
    .filter((event) => event.year <= selectedScope.maxYear)
    .sort((left, right) => left.year - right.year);

  const activeIndex = visibleEvents.findLastIndex(
    (event) => event.year <= focalYear,
  );

  return visibleEvents.map((event, index) => ({
    ...event,
    state:
      index === activeIndex
        ? "active"
        : event.year <= focalYear
          ? "past"
          : "future",
  }));
}
