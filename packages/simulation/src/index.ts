import type {
  Book,
  ChapterScope,
  SeriesManifest,
  StarSystem,
  TimelineEvent,
  TravelSegment,
  BobInstance,
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
      radius: star.id === "sol" ? 0.24 : 0.16,
      color: STAR_COLORS[index % STAR_COLORS.length] ?? "#f7d06b",
    };
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

export interface SceneFraming {
  /** Centre of the bounding sphere that contains every star. */
  center: CartesianCoordinate;
  /** Radius of that bounding sphere. Never zero, so callers can scale safely. */
  radius: number;
  /** Distance from the centre at which the whole field is comfortably framed. */
  cameraDistance: number;
  /**
   * Fog is measured from the camera, not from the origin, so the range is
   * derived from where the camera actually sits. A fixed range either does
   * nothing or swallows the scene depending on the content.
   */
  fogNear: number;
  fogFar: number;
}

export interface SceneFramingOptions {
  fovDegrees?: number;
  /**
   * How much of the viewport half-angle the bounding sphere should occupy.
   * Below 1 the sphere is comfortably inside the frame rather than touching
   * the edges, which is what a usable default view needs.
   */
  fillFactor?: number;
  minRadius?: number;
  minDistance?: number;
  maxDistance?: number;
}

/**
 * Derives camera distance, fog range, and framing centre from the stars that
 * are actually present.
 *
 * Hardcoded scene constants break as soon as the content changes: a grid
 * sized for one dataset dwarfs another, and a fog range starting beyond the
 * farthest star has no effect at all. Everything here is a function of the
 * content so the default view is always correct.
 */
export function computeSceneFraming(
  stars: Array<{ position: CartesianCoordinate }>,
  options: SceneFramingOptions = {},
): SceneFraming {
  const {
    fovDegrees = 42,
    fillFactor = 0.6,
    minRadius = 1,
    minDistance = 3,
    maxDistance = 26,
  } = options;

  if (stars.length === 0) {
    return {
      center: { x: 0, y: 0, z: 0 },
      radius: minRadius,
      cameraDistance: clamp(minRadius * 3, minDistance, maxDistance),
      fogNear: minRadius * 3,
      fogFar: minRadius * 12,
    };
  }

  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const star of stars) {
    min.x = Math.min(min.x, star.position.x);
    min.y = Math.min(min.y, star.position.y);
    min.z = Math.min(min.z, star.position.z);
    max.x = Math.max(max.x, star.position.x);
    max.y = Math.max(max.y, star.position.y);
    max.z = Math.max(max.z, star.position.z);
  }

  const center = {
    x: (min.x + max.x) / 2,
    y: (min.y + max.y) / 2,
    z: (min.z + max.z) / 2,
  };

  let radius = 0;
  for (const star of stars) {
    radius = Math.max(
      radius,
      Math.hypot(
        star.position.x - center.x,
        star.position.y - center.y,
        star.position.z - center.z,
      ),
    );
  }
  radius = Math.max(radius, minRadius);

  // Distance at which a sphere of this radius subtends the requested angle.
  const halfFov = (fovDegrees / 2) * (Math.PI / 180);
  const halfFovSine = Math.max(Math.sin(halfFov), 1e-6);
  const cameraDistance = clamp(
    (radius / halfFovSine) * fillFactor,
    minDistance,
    maxDistance,
  );

  return {
    center,
    radius,
    cameraDistance,
    fogNear: cameraDistance + radius * 0.25,
    fogFar: cameraDistance + radius * 2,
  };
}

/**
 * Deterministic pseudo-random generator (mulberry32). The backdrop is
 * procedurally generated, and it must look identical on every load and in
 * every test run, so it cannot use `Math.random`.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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

function isScopeWithinReadingFrontier(
  revealingScope: ChapterScope | undefined,
  selectedScope: ChapterScope,
  bookOrderById: Map<string, number>,
) {
  if (!revealingScope) return false;
  const revealingOrder = bookOrderById.get(revealingScope.bookId);
  const selectedOrder = bookOrderById.get(selectedScope.bookId);
  if (revealingOrder === undefined || selectedOrder === undefined) return false;
  if (revealingOrder < selectedOrder) return true;
  if (revealingOrder > selectedOrder) return false;
  return revealingScope.chapter <= selectedScope.chapter;
}

export function getScopedStarNote(
  star: StarSystem,
  books: Book[],
  scopes: ChapterScope[],
  selectedScope: ChapterScope,
) {
  if (!star.note) return undefined;
  if (!star.noteScopeId) return star.note;
  const bookOrderById = new Map(books.map((book) => [book.id, book.order]));
  const noteScope = scopes.find((scope) => scope.id === star.noteScopeId);
  return isScopeWithinReadingFrontier(
    noteScope,
    selectedScope,
    bookOrderById,
  )
    ? star.note
    : undefined;
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

export interface TravelSegmentState extends TravelSegment {
  state: "pre-departure" | "in-transit" | "arrived";
}

/**
 * Reader-scope-aware travel visibility. A segment is only visible once its
 * book is inside the reading frontier. Reveal follows the reader's chapter
 * boundary, not story chronology: a segment from a later chapter stays
 * hidden at an earlier reading frontier even if its departure year is
 * earlier than the selected scope's max year.
 */
export function getScopedTravelSegments(
  segments: TravelSegment[],
  books: Book[],
  scopes: ChapterScope[],
  selectedScope: ChapterScope,
  focalYear: number,
): TravelSegmentState[] {
  const selectedBook = books.find((book) => book.id === selectedScope.bookId);
  if (!selectedBook) {
    return [];
  }

  const bookOrderById = new Map(books.map((book) => [book.id, book.order]));
  const scopeById = new Map(scopes.map((scope) => [scope.id, scope]));

  const visibleSegments = segments.filter((segment) => {
    const segmentBookOrder = bookOrderById.get(segment.bookId);
    if (
      segmentBookOrder === undefined ||
      segmentBookOrder > selectedBook.order
    ) {
      return false;
    }

    // Disclosure follows the curated scope where the route is first
    // revealed, not whichever boundary happens to cover its departure year.
    return isScopeWithinReadingFrontier(
      scopeById.get(segment.revealedInScopeId),
      selectedScope,
      bookOrderById,
    );
  });

  return visibleSegments.map((segment) => {
    if (focalYear < segment.departureYear) {
      return { ...segment, state: "pre-departure" as const };
    }
    if (focalYear < segment.arrivalYear) {
      return { ...segment, state: "in-transit" as const };
    }
    return { ...segment, state: "arrived" as const };
  });
}

export type BobMovementState =
  | { kind: "stationary" }
  | {
      kind: "in-transit";
      segmentId: string;
      fromSystemId: string;
      toSystemId: string;
      progress: number;
    }
  | {
      kind: "arrived";
      segmentId: string;
      fromSystemId: string;
      toSystemId: string;
    };

export interface BobInstanceState extends BobInstance {
  state: "not-yet-replicated" | "present";
  currentSystemId: string;
  movement: BobMovementState;
}

/**
 * Deterministic replicant world state at a focal year, filtered through the
 * reading frontier. A replicant appears once it has been created and its
 * explicit first-reveal scope is inside the reader's frontier; its location
 * resolves from visible travel segments (in transit or arrived), falling
 * back to the home system. Segments that have not departed do not move anyone.
 */
export function getScopedBobInstances(
  bobs: BobInstance[],
  segments: TravelSegment[],
  books: Book[],
  scopes: ChapterScope[],
  selectedScope: ChapterScope,
  focalYear: number,
): BobInstanceState[] {
  const scopedSegments = getScopedTravelSegments(
    segments,
    books,
    scopes,
    selectedScope,
    focalYear,
  );

  const latestSegmentByBobId = new Map<string, TravelSegmentState>();
  for (const segment of scopedSegments) {
    if (segment.state === "pre-departure") continue;
    const existing = latestSegmentByBobId.get(segment.bobId);
    if (!existing || existing.departureYear < segment.departureYear) {
      latestSegmentByBobId.set(segment.bobId, segment);
    }
  }

  const selectedBook = books.find((book) => book.id === selectedScope.bookId);
  if (!selectedBook || focalYear > selectedScope.maxYear) {
    return [];
  }
  const bookOrderById = new Map(books.map((book) => [book.id, book.order]));

  return bobs
    .filter((bob) => {
      if (focalYear < bob.createdYear) {
        return false;
      }

      const introducedOrder = bookOrderById.get(bob.introducedInBookId);
      if (introducedOrder === undefined || introducedOrder > selectedBook.order) {
        return false;
      }

      // Identity disclosure follows the curated scope where the replicant
      // is first revealed. Story year alone is not reader knowledge.
      return isScopeWithinReadingFrontier(
        scopes.find((scope) => scope.id === bob.revealedInScopeId),
        selectedScope,
        bookOrderById,
      );
    })
    .map((bob) => {
      const segment = latestSegmentByBobId.get(bob.id);
      let currentSystemId = bob.homeSystemId;
      let movement: BobMovementState = { kind: "stationary" };

      if (segment?.state === "arrived") {
        currentSystemId = segment.toSystemId;
        movement = {
          kind: "arrived",
          segmentId: segment.id,
          fromSystemId: segment.fromSystemId,
          toSystemId: segment.toSystemId,
        };
      } else if (segment?.state === "in-transit") {
        const journeySpan = Math.max(
          segment.arrivalYear - segment.departureYear,
          Number.EPSILON,
        );
        movement = {
          kind: "in-transit",
          segmentId: segment.id,
          fromSystemId: segment.fromSystemId,
          toSystemId: segment.toSystemId,
          progress: Math.min(
            Math.max(
              (focalYear - segment.departureYear) / journeySpan,
              0,
            ),
            1,
          ),
        };
      }

      return {
        ...bob,
        state: "present" as const,
        currentSystemId,
        movement,
      };
    });
}

export type AtlasSearchResult =
  | {
      kind: "system";
      id: string;
      title: string;
      subtitle: string;
      system: SceneStarNode;
    }
  | {
      kind: "replicant";
      id: string;
      title: string;
      subtitle: string;
      replicant: BobInstanceState;
    }
  | {
      kind: "event";
      id: string;
      title: string;
      subtitle: string;
      event: TimelineEventState;
    };

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase();
}

function getSearchScore(query: string, ...values: string[]) {
  const normalizedValues = values.map(normalizeSearchText);
  if (normalizedValues.some((value) => value.startsWith(query))) {
    return 0;
  }
  if (normalizedValues.some((value) => value.includes(query))) {
    return 1;
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * Searches only reader-visible content. Results are deliberately grouped by
 * entity kind so the UI can present systems, replicants, and events without
 * exposing records beyond the selected reading frontier.
 */
export function searchVisibleAtlas(
  query: string,
  systems: SceneStarNode[],
  replicants: BobInstanceState[],
  events: TimelineEventState[],
  limit = 9,
): AtlasSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return [];
  }

  const results: Array<AtlasSearchResult & { score: number }> = [
    ...systems.map((system) => ({
      kind: "system" as const,
      id: system.id,
      title: system.name,
      subtitle: `${system.distanceLy.toFixed(2)} ly · stellar system`,
      system,
      score: getSearchScore(normalizedQuery, system.name, system.id),
    })),
    ...replicants.map((replicant) => ({
      kind: "replicant" as const,
      id: replicant.id,
      title: replicant.name,
      subtitle: `Generation ${replicant.generation} · replicant`,
      replicant,
      score: getSearchScore(
        normalizedQuery,
        replicant.name,
        replicant.id,
        replicant.homeSystemId,
        replicant.currentSystemId,
        ...(replicant.movement.kind === "in-transit"
          ? [replicant.movement.fromSystemId, replicant.movement.toSystemId]
          : []),
      ),
    })),
    ...events.map((event) => ({
      kind: "event" as const,
      id: event.id,
      title: event.label,
      subtitle: `${formatAtlasYear(event.year)} · ${event.type.replace(/-/g, " ")}`,
      event,
      score: getSearchScore(
        normalizedQuery,
        event.label,
        event.id,
        event.type.replace(/-/g, " "),
      ),
    })),
  ]
    .filter((result) => Number.isFinite(result.score))
    .sort(
      (left, right) =>
        left.score - right.score || left.title.localeCompare(right.title),
    )
    .slice(0, Math.max(0, limit));

  return results.map(({ score: _score, ...result }) => result);
}

export function formatAtlasYear(year: number) {
  if (!Number.isFinite(year)) {
    return "—";
  }
  return Number.isInteger(year) ? String(year) : year.toFixed(1);
}
