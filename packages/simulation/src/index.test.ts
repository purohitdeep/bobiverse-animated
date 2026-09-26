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
  buildStarPointAttributes,
  clampYearToBounds,
  computeSceneFraming,
  createSeededRandom,
  getStarColor,
  getStarColorFromTemperature,
  getStarDisplayStyles,
  getStarEffectiveTemperature,
  getScopedBobInstances,
  getScopedStarNote,
  getScopedTimelineEvents,
  getScopedTravelSegments,
  getTimelineBounds,
  formatAtlasYear,
  searchVisibleAtlas,
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
    revealedInScopeId: "test-scope",
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
    revealedInScopeId: "test-scope",
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

describe("getStarEffectiveTemperature", () => {
  it("reproduces the solar effective temperature from the Sun's colour index", () => {
    // B-V 0.65 should give roughly the accepted ~5772 K.
    expect(getStarEffectiveTemperature(0.65)).toBeGreaterThan(5600);
    expect(getStarEffectiveTemperature(0.65)).toBeLessThan(5900);
  });

  it("cools monotonically as colour index rises", () => {
    const hot = getStarEffectiveTemperature(0.3);
    const mid = getStarEffectiveTemperature(1.0);
    const cool = getStarEffectiveTemperature(1.8);
    expect(hot).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(cool);
  });

  it("clamps absurd colour indices into a physical range", () => {
    expect(Number.isFinite(getStarEffectiveTemperature(-99))).toBe(true);
    expect(Number.isFinite(getStarEffectiveTemperature(99))).toBe(true);
  });
});

describe("getStarColorFromTemperature", () => {
  it("keeps every channel within the displayable range", () => {
    for (const kelvin of [1500, 3000, 5772, 10000, 25000]) {
      const color = getStarColorFromTemperature(kelvin);
      for (const channel of [color.r, color.g, color.b]) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(1);
      }
    }
  });

  it("renders hotter stars bluer and cooler stars redder", () => {
    const hot = getStarColorFromTemperature(12000);
    const cool = getStarColorFromTemperature(3200);
    // "Bluer" means the blue channel leads the red channel.
    expect(hot.b - hot.r).toBeGreaterThan(cool.b - cool.r);
  });
});

describe("getStarColor", () => {
  it("falls back to a neutral tint when no colour index is recorded", () => {
    const color = getStarColor(undefined);
    expect(color.r).toBeCloseTo(color.b, 1);
  });

  it("does not depend on the order stars are supplied in", () => {
    // The previous palette indexed by array position, so reordering the
    // content silently recoloured the map.
    const a = makeStar({ id: "a", colorIndexBv: 0.65 });
    const b = makeStar({ id: "b", colorIndexBv: 1.5 });
    const forward = getStarDisplayStyles([a, b]);
    const reversed = getStarDisplayStyles([b, a]);
    expect(reversed.get("a")?.color).toEqual(forward.get("a")?.color);
    expect(reversed.get("b")?.color).toEqual(forward.get("b")?.color);
  });
});

describe("getStarDisplayStyles", () => {
  const sol = makeStar({ id: "sol", visualMagnitude: -26.74, colorIndexBv: 0.65 });
  const bright = makeStar({ id: "bright", visualMagnitude: -0.1, colorIndexBv: 0.5 });
  const faint = makeStar({ id: "faint", visualMagnitude: 4.43, colorIndexBv: 0.82 });

  it("gives the brightest star the largest size and the faintest the smallest", () => {
    const styles = getStarDisplayStyles([sol, bright, faint]);
    expect(styles.get("sol")?.size).toBeGreaterThan(styles.get("bright")?.size ?? 0);
    expect(styles.get("bright")?.size).toBeGreaterThan(styles.get("faint")?.size ?? 0);
  });

  it("keeps the brightest star from swallowing the field", () => {
    // Sol is ~10^10 brighter than Alpha Centauri. Size must be compressed so
    // the other systems stay legible next to it.
    const styles = getStarDisplayStyles([sol, bright, faint]);
    const ratio = (styles.get("sol")?.size ?? 0) / (styles.get("faint")?.size ?? 1);
    expect(ratio).toBeLessThan(6);
  });

  it("never renders any star at zero size", () => {
    const styles = getStarDisplayStyles([faint]);
    expect(styles.get("faint")?.size).toBeGreaterThan(0);
  });

  it("handles a star with no recorded magnitude", () => {
    const styles = getStarDisplayStyles([sol, makeStar({ id: "unknown" })]);
    expect(styles.get("unknown")?.size).toBeGreaterThan(0);
  });

  it("handles a dataset where every magnitude is identical", () => {
    const a = makeStar({ id: "a", visualMagnitude: 3 });
    const b = makeStar({ id: "b", visualMagnitude: 3 });
    const styles = getStarDisplayStyles([a, b]);
    expect(Number.isFinite(styles.get("a")?.size)).toBe(true);
    expect(styles.get("a")?.size).toBeGreaterThan(0);
  });
});

describe("buildStarPointAttributes", () => {
  it("packs one position, colour, and size per star", () => {
    const stars = [
      { ...makeStar({ id: "a" }), position: { x: 1, y: 2, z: 3 } },
      { ...makeStar({ id: "b" }), position: { x: 4, y: 5, z: 6 } },
    ];
    const attributes = buildStarPointAttributes(stars);
    expect(attributes.positions).toHaveLength(6);
    expect(attributes.colors).toHaveLength(6);
    expect(attributes.sizes).toHaveLength(2);
    expect(attributes.ids).toEqual(["a", "b"]);
    expect(attributes.positions[3]).toBe(4);
  });

  it("produces an empty but valid buffer set for no stars", () => {
    const attributes = buildStarPointAttributes([]);
    expect(attributes.positions).toHaveLength(0);
    expect(attributes.ids).toEqual([]);
  });
});

describe("computeSceneFraming", () => {
  it("returns a safe framing with no stars instead of dividing by zero", () => {
    const framing = computeSceneFraming([]);
    expect(framing.center).toEqual({ x: 0, y: 0, z: 0 });
    expect(framing.radius).toBeGreaterThan(0);
    expect(Number.isFinite(framing.cameraDistance)).toBe(true);
    expect(framing.fogFar).toBeGreaterThan(framing.fogNear);
  });

  it("centres the bounding sphere on the content", () => {
    const framing = computeSceneFraming([
      { position: { x: -2, y: 0, z: 0 } },
      { position: { x: 2, y: 0, z: 0 } },
    ]);
    expect(framing.center.x).toBeCloseTo(0);
    expect(framing.radius).toBeCloseTo(2);
  });

  it("keeps fog inside a range that actually spans the star field", () => {
    // A fog range that starts beyond the framing distance hides nothing and
    // reads as a bug; this is the failure the derived range exists to prevent.
    const framing = computeSceneFraming([
      { position: { x: 0, y: 0, z: 0 } },
      { position: { x: 5, y: 0, z: 0 } },
    ]);
    expect(framing.fogNear).toBeGreaterThan(framing.cameraDistance);
    expect(framing.fogFar).toBeGreaterThan(framing.cameraDistance + framing.radius);
  });

  it("pulls the camera back as the content grows", () => {
    const small = computeSceneFraming([{ position: { x: 0, y: 0, z: 0 } }, { position: { x: 1, y: 0, z: 0 } }]);
    const large = computeSceneFraming([{ position: { x: 0, y: 0, z: 0 } }, { position: { x: 20, y: 0, z: 0 } }]);
    expect(large.cameraDistance).toBeGreaterThan(small.cameraDistance);
  });

  it("keeps a single star from collapsing the framing", () => {
    const framing = computeSceneFraming([{ position: { x: 1, y: 1, z: 1 } }]);
    expect(framing.radius).toBeGreaterThanOrEqual(1);
    expect(framing.cameraDistance).toBeGreaterThan(0);
  });
});

describe("createSeededRandom", () => {
  it("is deterministic for the same seed", () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    const first = [a(), a(), a()];
    const second = [b(), b(), b()];
    expect(first).toEqual(second);
  });

  it("produces different sequences for different seeds", () => {
    const a = createSeededRandom(1);
    const b = createSeededRandom(2);
    expect(a()).not.toBe(b());
  });

  it("stays within [0, 1)", () => {
    const next = createSeededRandom(7);
    for (let i = 0; i < 200; i++) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

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

describe("getScopedStarNote", () => {
  it("keeps a public system note hidden until its narrative scope is reached", () => {
    const star = makeStar({
      note: "A later-book conflict system.",
      noteScopeId: "scope-finale",
    });
    const earlyScope = makeScope({ id: "scope-early", chapter: 1, maxYear: 2120 });
    const lateScope = makeScope({ id: "scope-finale", chapter: 10, maxYear: 2200 });
    const books = [makeBook()];

    expect(
      getScopedStarNote(star, books, [earlyScope, lateScope], earlyScope),
    ).toBeUndefined();
    expect(
      getScopedStarNote(star, books, [earlyScope, lateScope], lateScope),
    ).toBe("A later-book conflict system.");
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

  it("hides a route first revealed in a later chapter even when its year is early", () => {
    const segments = getScopedTravelSegments(
      [
        makeSegment({
          departureYear: 2140,
          arrivalYear: 2150,
          revealedInScopeId: "scope-finale",
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
    expect(bobs[0]?.movement).toEqual({
      kind: "arrived",
      segmentId: "test-segment",
      fromSystemId: "test-star",
      toSystemId: "target-star",
    });
  });

  it("keeps the latest departed journey when a later route is only planned", () => {
    const bobs = getScopedBobInstances(
      [makeBob()],
      [
        makeSegment(),
        makeSegment({
          id: "future-segment",
          departureYear: 2160,
          arrivalYear: 2170,
        }),
      ],
      [makeBook()],
      [makeScope()],
      makeScope(),
      2155,
    );

    expect(bobs[0]?.currentSystemId).toBe("target-star");
    expect(bobs[0]?.movement.kind).toBe("arrived");
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

  it("hides replicants created beyond the selected frontier", () => {
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

  it("hides a replicant first revealed in a later chapter", () => {
    const bobs = getScopedBobInstances(
      [makeBob({ createdYear: 2140, revealedInScopeId: "scope-finale" })],
      [],
      [makeBook()],
      [
        makeScope({ id: "scope-early", chapter: 1, maxYear: 2120 }),
        makeScope({ id: "scope-finale", chapter: 10, maxYear: 2200 }),
      ],
      makeScope({ id: "scope-early", chapter: 1, maxYear: 2120 }),
      2140,
    );
    expect(bobs).toHaveLength(0);
  });

  it("exposes deterministic progress while a replicant is in transit", () => {
    const bobs = getScopedBobInstances(
      [makeBob()],
      [makeSegment()],
      [makeBook()],
      [makeScope()],
      makeScope(),
      2145,
    );

    expect(bobs[0]?.movement).toEqual({
      kind: "in-transit",
      segmentId: "test-segment",
      fromSystemId: "test-star",
      toSystemId: "target-star",
      progress: 0.5,
    });
  });
});

describe("searchVisibleAtlas", () => {
  const system = {
    ...makeStar(),
    position: { x: 0, y: 0, z: 0 },
    radius: 0.1,
    color: "#fff",
  };
  const replicant = {
    ...makeBob({ name: "Bob Prime" }),
    state: "present" as const,
    currentSystemId: "test-star",
    movement: { kind: "stationary" as const },
  };
  const event = {
    ...makeEvent({ label: "Bob reaches Epsilon Eridani" }),
    state: "future" as const,
  };

  it("prioritizes prefix matches across visible entity types", () => {
    const results = searchVisibleAtlas("bob", [system], [replicant], [event]);
    expect(results.map((result) => result.kind)).toEqual([
      "replicant",
      "event",
    ]);
  });

  it("ignores empty queries and unmatched records", () => {
    expect(searchVisibleAtlas("  ", [system], [replicant], [event])).toEqual(
      [],
    );
    expect(
      searchVisibleAtlas("nothing", [system], [replicant], [event]),
    ).toEqual([]);
  });

  it("respects the result limit", () => {
    const results = searchVisibleAtlas("test", [system], [replicant], [event], 2);
    expect(results).toHaveLength(2);
  });
});

describe("formatAtlasYear", () => {
  it("keeps whole years compact and rounds fractional years", () => {
    expect(formatAtlasYear(2144)).toBe("2144");
    expect(formatAtlasYear(2144.64)).toBe("2144.6");
    expect(formatAtlasYear(Number.NaN)).toBe("—");
  });
});
