import { describe, expect, it } from "vitest";
import type {
  Book,
  ChapterScope,
  StarSystem,
  TimelineEvent,
} from "@bobiverse/domain";
import {
  clampYearToBounds,
  getScopedTimelineEvents,
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
        makeEvent({ id: "early", year: 2140 }),
        makeEvent({ id: "late", year: 2160 }),
      ],
      [makeBook()],
      "test-book",
      2200,
      2150,
    );
    expect(events.map((event) => event.state)).toEqual(["active", "future"]);
  });

  it("hides events beyond the scope max year", () => {
    const events = getScopedTimelineEvents(
      [makeEvent({ id: "beyond", year: 2190 })],
      [makeBook()],
      "test-book",
      2180,
      2200,
    );
    expect(events).toHaveLength(0);
  });

  it("keeps events from unselected books hidden", () => {
    const events = getScopedTimelineEvents(
      [makeEvent({ id: "other-book", bookId: "later-book" })],
      [makeBook()],
      "test-book",
      2200,
      2200,
    );
    expect(events).toHaveLength(0);
  });
});
