import { describe, expect, it } from "vitest";
import {
  assertAtlasHasNoErrors,
  formatAtlasValidationReport,
  validateAtlas,
} from "./validate.ts";

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
    expect(text).toContain("Findings: none");
  });
});
