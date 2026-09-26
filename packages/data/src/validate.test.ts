import { describe, expect, it } from "vitest";
import type { StarSystem } from "@bobiverse/domain";
import {
  assertAtlasHasNoErrors,
  collectStarPhotometryFindings,
  formatAtlasValidationReport,
  validateAtlas,
} from "./validate.ts";

function makeStar(overrides: Partial<StarSystem> = {}): StarSystem {
  return {
    id: "test-star",
    name: "Test Star",
    raHours: 0,
    decDegrees: 0,
    distanceLy: 10,
    sourceType: "catalog",
    sourceIds: ["test-source"],
    reviewStatus: "verified",
    ...overrides,
  };
}

describe("collectStarPhotometryFindings", () => {
  it("accepts a distance consistent with its parallax", () => {
    // 1000 / 310.5773 mas = 3.22 pc = 10.50 ly
    const findings = collectStarPhotometryFindings([
      makeStar({ distanceLy: 10.5, parallaxMas: 310.5773 }),
    ]);
    expect(findings).toEqual([]);
  });

  it("catches a parsec value recorded as light-years", () => {
    // This is the real defect found in the seed data: Delta Pavonis stored
    // 6.1, which is its distance in parsecs, in a field named distanceLy.
    const findings = collectStarPhotometryFindings([
      makeStar({ id: "delta-pavonis", distanceLy: 6.1, parallaxMas: 163.9544 }),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.message).toMatch(/parsec\/light-year mix-up/);
    expect(findings[0]?.message).toMatch(/19\.89/);
  });

  it("tolerates the small differences between parallax epochs", () => {
    const findings = collectStarPhotometryFindings([
      makeStar({ distanceLy: 29.5, parallaxMas: 110.0254 }),
      makeStar({ distanceLy: 16.45, parallaxMas: 199.608 }),
    ]);
    expect(findings).toEqual([]);
  });

  it("rejects a colour index outside the stellar range", () => {
    const findings = collectStarPhotometryFindings([
      makeStar({ colorIndexBv: 4.2 }),
    ]);
    expect(findings[0]?.message).toMatch(/colorIndexBv/);
  });

  it("rejects a magnitude outside the naked-eye catalog range", () => {
    const findings = collectStarPhotometryFindings([
      makeStar({ visualMagnitude: 42 }),
    ]);
    expect(findings[0]?.message).toMatch(/visualMagnitude/);
  });

  it("accepts the Sun's extreme apparent magnitude", () => {
    const findings = collectStarPhotometryFindings([
      makeStar({ distanceLy: 0, visualMagnitude: -26.74, colorIndexBv: 0.65 }),
    ]);
    expect(findings).toEqual([]);
  });

  it("skips the distance check when no parallax is recorded", () => {
    const findings = collectStarPhotometryFindings([makeStar({ distanceLy: 99 })]);
    expect(findings).toEqual([]);
  });
});

describe("validateAtlas on seed content", () => {
  it("passes with no errors on committed seed content", () => {
    const report = validateAtlas();
    expect(report.findings.filter((f) => f.severity === "error")).toEqual([]);
  });

  it("resolves every bob instance reference in events", () => {
    const report = validateAtlas();
    const unknownBobErrors = report.findings.filter(
      (f) =>
        f.severity === "error" &&
        f.message.includes("unknown bob instance reference"),
    );
    expect(unknownBobErrors).toEqual([]);
  });

  it("counts all collections in the summary", () => {
    const report = validateAtlas();
    expect(report.counts).toEqual({
      sources: 7,
      starSystems: 7,
      books: 3,
      chapterScopes: 6,
      events: 10,
      bobInstances: 5,
      travelSegments: 1,
    });
  });
});

describe("assertAtlasHasNoErrors", () => {
  it("throws on a report containing errors", () => {
    expect(() =>
      assertAtlasHasNoErrors({
        findings: [
          {
            severity: "error",
            collection: "timeline event",
            recordId: "probe",
            message: "test finding",
          },
        ],
        counts: {
          sources: 0,
          starSystems: 0,
          books: 0,
          chapterScopes: 0,
          events: 0,
          bobInstances: 0,
          travelSegments: 0,
        },
      }),
    ).toThrow(/probe/);
  });
});

describe("formatAtlasValidationReport", () => {
  it("lists findings when present", () => {
    const text = formatAtlasValidationReport({
      findings: [
        {
          severity: "error",
          collection: "star system",
          recordId: "probe-star",
          message: "raHours outside [0, 24)",
        },
      ],
      counts: {
        sources: 0,
        starSystems: 1,
        books: 0,
        chapterScopes: 0,
        events: 0,
        bobInstances: 0,
        travelSegments: 0,
      },
    });
    expect(text).toContain("probe-star");
    expect(text).toContain("raHours outside [0, 24)");
  });

  it("reports a clean content set with no findings", () => {
    const text = formatAtlasValidationReport({
      findings: [],
      counts: {
        sources: 0,
        starSystems: 0,
        books: 0,
        chapterScopes: 0,
        events: 0,
        bobInstances: 0,
        travelSegments: 0,
      },
    });
    expect(text).toContain("Replicants: 0");
    expect(text).toContain("Travel segments: 0");
    expect(text).toContain("Findings: none");
  });
});
