import { describe, expect, it } from "vitest";
import {
  assertContentAuditHasNoErrors,
  formatContentAuditReport,
  runContentAudit,
  type ContentAuditReport,
} from "./audit.ts";
import {
  atlasBobInstances,
  atlasBooks,
  atlasChapterScopes,
  atlasTimelineEvents,
  atlasTravelSegments,
  knowledgeSources,
  seedStarSystems,
} from "./index.ts";

describe("seed content integrity", () => {
  it("references only known books", () => {
    const bookIds = new Set(atlasBooks.map((book) => book.id));
    for (const event of atlasTimelineEvents) {
      expect(bookIds.has(event.bookId), event.id).toBe(true);
    }
  });

  it("references only known chapter scopes", () => {
    const scopeIds = new Set(atlasChapterScopes.map((scope) => scope.id));
    for (const event of atlasTimelineEvents) {
      if (event.chapterScopeId) {
        expect(scopeIds.has(event.chapterScopeId), event.id).toBe(true);
      }
    }
  });

  it("references only known star systems", () => {
    const starIds = new Set(seedStarSystems.map((star) => star.id));
    for (const event of atlasTimelineEvents) {
      if (event.starSystemId) {
        expect(starIds.has(event.starSystemId), event.id).toBe(true);
      }
    }
  });

  it("references only known sources everywhere", () => {
    const sourceIds = new Set(knowledgeSources.map((source) => source.id));
    for (const event of atlasTimelineEvents) {
      for (const sourceId of event.sourceIds) {
        expect(sourceIds.has(sourceId), event.id).toBe(true);
      }
    }
  });
});

describe("runContentAudit", () => {
  it("passes on the committed seed content", () => {
    const report = runContentAudit();
    expect(() => assertContentAuditHasNoErrors(report)).not.toThrow();
  });

  it("counts every audited record exactly once", () => {
    const report = runContentAudit();
    const expected =
      seedStarSystems.length +
      atlasBooks.length +
      atlasChapterScopes.length +
      atlasTimelineEvents.length +
      atlasBobInstances.length +
      atlasTravelSegments.length;
    expect(report.summary.recordCount).toBe(expected);
  });

  it("reports pending-review warnings for the provisional seed", () => {
    const report = runContentAudit();
    expect(
      report.findings.some(
        (finding) =>
          finding.severity === "warning" &&
          finding.message.includes("pending review"),
      ),
    ).toBe(true);
  });
});

describe("assertContentAuditHasNoErrors", () => {
  it("throws with the formatted report when errors exist", () => {
    const report: ContentAuditReport = {
      summary: {
        sourceCount: 0,
        recordCount: 1,
        reviewStatusCounts: {
          canonical: 0,
          verified: 0,
          "pending-review": 0,
          disputed: 0,
          deprecated: 0,
        },
        authorityCounts: { primary: 0, secondary: 0, reference: 0 },
      },
      findings: [
        {
          severity: "error",
          collection: "timeline event",
          recordId: "bad-record",
          message: "canonical records must cite at least one primary source",
        },
      ],
    };
    expect(() => assertContentAuditHasNoErrors(report)).toThrow(/bad-record/);
  });
});

describe("formatContentAuditReport", () => {
  it("includes summary counts and no-error line", () => {
    const report = runContentAudit();
    const text = formatContentAuditReport(report);
    expect(text).toContain("Errors: none");
    expect(text).toContain("Records audited:");
  });
});
