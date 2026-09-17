import { describe, expect, it } from "vitest";
import type {
  Book,
  BobInstance,
  ChapterScope,
  StarSystem,
  TimelineEvent,
  TravelSegment,
} from "@bobiverse/domain";
import {
  clampYearToBounds,
  getScopedBobInstances,
  getScopedTimelineEvents,
  getScopedTravelSegments,
  getTimelineBounds,
  toCartesianCoordinate,
} from "./index.ts";

function makeStar(overrides: Partial<StarSystem> = {}): StarSystem {
  return {
    id: "test-star",
    name: "Test Star",
    raHours: 0,
    decDegrees: 0,
    distanceLy: 1,
    sourceType: "catalog",
    sourceIds: ["test-source"],
    reviewStatus: "verified",
    ...overrides,
  };
}

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "test-book",
    order: 1,
    title: "Test Book",
    shortTitle: "TB",
    chapterCount: 10,
    timelineStartYear: 2100,
    timelineEndYear: 2200,
    sourceIds: ["test-source"],
    reviewStatus: "canonical",
    ...overrides,
  };
}

function makeScope(overrides: Partial<ChapterScope> = {}): ChapterScope {
  return {
    id: "test-scope",
    bookId: "test-book",
    chapter: 1,
    label: "Test Scope",
    maxYear: 2200,
    sourceIds: ["test-source"],
    reviewStatus: "pending-review",
    evidenceNote: "test fixture",
    ...overrides,
  };
}

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: "test-event",
    bookId: "test-book",
    type: "narrative",
    label: "Test event",
    year: 2150,
    bobIds: [],
    sourceIds: ["test-source"],
    reviewStatus: "pending-review",
    evidenceNote: "test fixture",
    ...overrides,
  };
}

function makeBob(overrides: Partial<BobInstance> = {}): BobInstance {
  return {
    id: "test-bob",
    name: "Test Bob",
    generation: 1,
    introducedInBookId: "test-book",
    createdYear: 2135,
    homeSystemId: "test-star",
    sourceIds: ["test-source"],
    reviewStatus: "pending-review",
    evidenceNote: "test fixture",
    ...overrides,
  };
}

function makeSegment(
  overrides: Partial<TravelSegment> = {},
): TravelSegment {
  return {
    id: "test-segment",
    bobId: "test-bob",
    bookId: "test-book",
    fromSystemId: "test-star",
    toSystemId: "target-star",
    departureYear: 2140,
    arrivalYear: 2150,
    sourceIds: ["test-source"],
    reviewStatus: "pending-review",
    evidenceNote: "test fixture",
    ...overrides,
  };
}

describe("toCartesianCoordinate", () => {
  it("places a star at the origin when distance is zero", () => {
    const coordinate = toCartesianCoordinate(makeStar({ distanceLy: 0 }));
    expect(coordinate.x).toBe(0);
    expect(coordinate.y).toBe(0);
    expect(coordinate.z).toBe(0);
  });

  it("maps positive declination to the z axis", () => {
    const coordinate = toCartesianCoordinate(
      makeStar({ decDegrees: 90, distanceLy: 2 }),
    );
    expect(coordinate.z).toBeCloseTo(2, 10);
  });

  it("maps equatorial right ascension into the x-y plane", () => {
    const coordinate = toCartesianCoordinate(
      makeStar({ raHours: 6, decDegrees: 0, distanceLy: 3 }),
    );
    expect(coordinate.x).toBeCloseTo(0, 10);
    expect(coordinate.y).toBeCloseTo(3, 10);
  });
});

describe("getTimelineBounds", () => {
  it("derives bounds from books and scopes", () => {
    const bounds = getTimelineBounds(
      [makeBook({ timelineStartYear: 2133 })],
      [makeScope({ maxYear: 2188.9 })],
    );
    expect(bounds).toEqual({ startYear: 2133, endYear: 2188.9 });
  });

  it("returns non-finite bounds for empty input instead of crashing", () => {
    const bounds = getTimelineBounds([], []);
    expect(bounds.startYear).toBe(Infinity);
    expect(bounds.endYear).toBe(-Infinity);
  });
});

describe("clampYearToBounds", () => {
  it("clamps to the nearest bound", () => {
    expect(clampYearToBounds(1000, { startYear: 2133, endYear: 2200 })).toBe(
      2133,
    );
    expect(clampYearToBounds(9999, { startYear: 2133, endYear: 2200 })).toBe(
      2200,
    );
    expect(clampYearToBounds(2160, { startYear: 2133, endYear: 2200 })).toBe(
      2160,
    );
  });
});

describe("getScopedTimelineEvents", () => {
  it("marks the most recent event at or before the focal year as active", () => {
    const events = getScopedTimelineEvents(
      [
        makeEvent({ id: "early", year: 2140, chapterScopeId: "test-scope" }),
        makeEvent({ id: "late", year: 2160, chapterScopeId: "test-scope" }),
      ],
      [makeBook()],
      [makeScope()],
      makeScope(),
      2150,
    );
    expect(events.map((event) => event.state)).toEqual(["active", "future"]);
  });

  it("hides events beyond the scope max year", () => {
    const events = getScopedTimelineEvents(
      [makeEvent({ id: "beyond", year: 2190 })],
      [makeBook()],
      [makeScope()],
      makeScope(),
      2200,
    );
    expect(events).toHaveLength(0);
  });

  it("keeps events from unselected books hidden", () => {
    const events = getScopedTimelineEvents(
      [makeEvent({ id: "other-book", bookId: "later-book" })],
      [makeBook()],
      [makeScope()],
      makeScope(),
      2200,
    );
    expect(events).toHaveLength(0);
  });

  it("hides a later-chapter event with an earlier year at an earlier scope", () => {
    const events = getScopedTimelineEvents(
      [
        makeEvent({
          id: "spoiler",
          year: 2110,
          chapterScopeId: "scope-finale",
        }),
      ],
      [makeBook()],
      [
        makeScope({ id: "scope-early", chapter: 1, maxYear: 2120 }),
        makeScope({ id: "scope-finale", chapter: 10, maxYear: 2200 }),
      ],
      makeScope({ id: "scope-early", chapter: 1, maxYear: 2120 }),
      2120,
    );
    expect(events).toHaveLength(0);
  });

  it("shows a same-book event once its chapter scope is reached", () => {
    const events = getScopedTimelineEvents(
      [
        makeEvent({
          id: "revealed",
          year: 2110,
          chapterScopeId: "scope-finale",
        }),
      ],
      [makeBook()],
      [
        makeScope({ id: "scope-early", chapter: 1, maxYear: 2120 }),
        makeScope({ id: "scope-finale", chapter: 10, maxYear: 2200 }),
      ],
      makeScope({ id: "scope-finale", chapter: 10, maxYear: 2200 }),
      2200,
    );
    expect(events.map((event) => event.id)).toEqual(["revealed"]);
  });

  it("hides events that carry no chapter scope until they are curated", () => {
    const events = getScopedTimelineEvents(
      [makeEvent({ id: "unscoped", chapterScopeId: undefined })],
      [makeBook()],
      [makeScope()],
      makeScope(),
      2200,
    );
    expect(events).toHaveLength(0);
  });

  it("shows events from an earlier book regardless of their chapter", () => {
    const events = getScopedTimelineEvents(
      [
        makeEvent({
          id: "prior-book",
          bookId: "earlier-book",
          chapterScopeId: "earlier-scope",
        }),
      ],
      [makeBook({ id: "earlier-book", order: 1 }), makeBook({ order: 2 })],
      [
        makeScope({ id: "earlier-scope", bookId: "earlier-book", chapter: 5 }),
        makeScope(),
      ],
      makeScope(),
      2200,
    );
    expect(events.map((event) => event.id)).toEqual(["prior-book"]);
  });
});

describe("getScopedTravelSegments", () => {
  it("reports a segment as in transit between departure and arrival", () => {
    const segments = getScopedTravelSegments(
      [makeSegment()],
      [makeBook()],
      [makeScope()],
      makeScope(),
      2145,
    );
    expect(segments.map((segment) => segment.state)).toEqual(["in-transit"]);
  });

  it("reports pre-departure before and arrived after the journey", () => {
    const before = getScopedTravelSegments(
      [makeSegment()],
      [makeBook()],
      [makeScope()],
      makeScope(),
      2135,
    );
    const after = getScopedTravelSegments(
      [makeSegment()],
      [makeBook()],
      [makeScope()],
      makeScope(),
      2160,
    );
    expect(before.map((s) => s.state)).toEqual(["pre-departure"]);
    expect(after.map((s) => s.state)).toEqual(["arrived"]);
  });

  it("hides segments whose book is outside the reading frontier", () => {
    const segments = getScopedTravelSegments(
      [makeSegment({ bookId: "later-book" })],
      [makeBook()],
      [makeScope()],
      makeScope(),
      2200,
    );
    expect(segments).toHaveLength(0);
  });

  it("hides segments departing after the selected scope's max year", () => {
    const segments = getScopedTravelSegments(
      [makeSegment({ departureYear: 2190, arrivalYear: 2199 })],
      [makeBook()],
      [makeScope({ maxYear: 2180 })],
      makeScope({ maxYear: 2180 }),
      2180,
    );
    expect(segments).toHaveLength(0);
  });
});

describe("getScopedBobInstances", () => {
  it("hides a replicant created after the focal year", () => {
    const bobs = getScopedBobInstances(
      [makeBob({ createdYear: 2160 })],
      [],
      [makeBook()],
      [makeScope()],
      makeScope(),
      2150,
    );
    expect(bobs).toHaveLength(0);
  });

  it("places a stationary replicant at its home system", () => {
    const bobs = getScopedBobInstances(
      [makeBob()],
      [],
      [makeBook()],
      [makeScope()],
      makeScope(),
      2160,
    );
    expect(bobs.map((b) => [b.id, b.state, b.currentSystemId])).toEqual([
      ["test-bob", "present", "test-star"],
    ]);
  });

  it("moves a replicant to the destination once its journey has arrived", () => {
    const bobs = getScopedBobInstances(
      [makeBob()],
      [makeSegment()],
      [makeBook()],
      [makeScope()],
      makeScope(),
      2160,
    );
    expect(bobs[0]?.currentSystemId).toBe("target-star");
  });

  it("keeps a replicant at home while its journey is in transit", () => {
    const bobs = getScopedBobInstances(
      [makeBob()],
      [makeSegment()],
      [makeBook()],
      [makeScope()],
      makeScope(),
      2145,
    );
    expect(bobs[0]?.currentSystemId).toBe("test-star");
  });

  it("hides replicants introduced beyond the selected chapter scope", () => {
    const bobs = getScopedBobInstances(
      [makeBob({ createdYear: 2190 })],
      [],
      [makeBook()],
      [makeScope({ maxYear: 2180 })],
      makeScope({ maxYear: 2180 }),
      2200,
    );
    expect(bobs).toHaveLength(0);
  });
});
