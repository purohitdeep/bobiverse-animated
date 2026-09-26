import type { Book, ChapterScope, StarSystem, TimelineEvent } from "@bobiverse/domain";
import {
  atlasBobInstances,
  atlasBooks,
  atlasChapterScopes,
  atlasSeriesManifest,
  atlasTimelineEvents,
  atlasTravelSegments,
  knowledgeSources,
  seedStarSystems,
} from "./index.ts";

export interface AtlasValidationFinding {
  severity: "error" | "warning";
  collection: string;
  recordId?: string | undefined;
  message: string;
}

export interface AtlasValidationReport {
  findings: AtlasValidationFinding[];
  counts: {
    sources: number;
    starSystems: number;
    books: number;
    chapterScopes: number;
    events: number;
    bobInstances: number;
    travelSegments: number;
  };
}

function addFinding(
  findings: AtlasValidationFinding[],
  finding: AtlasValidationFinding,
) {
  findings.push(finding);
}

function collectDuplicateIds(
  collection: string,
  records: Array<{ id: string }>,
  findings: AtlasValidationFinding[],
) {
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) {
      addFinding(findings, {
        severity: "error",
        collection,
        recordId: record.id,
        message: "duplicate id",
      });
    }
    seen.add(record.id);
  }
}

interface ReferenceCheck {
  field: string;
  referencedId: string | undefined;
  knownIds: Set<string>;
  referencedLabel: string;
}

function collectReferenceFindings(
  collection: string,
  recordId: string,
  checks: ReferenceCheck[],
  findings: AtlasValidationFinding[],
) {
  for (const check of checks) {
    if (
      check.referencedId !== undefined &&
      !check.knownIds.has(check.referencedId)
    ) {
      addFinding(findings, {
        severity: "error",
        collection,
        recordId,
        message: `unknown ${check.referencedLabel} reference: ${check.referencedId} (field ${check.field})`,
      });
    }
  }
}

/**
 * Referential and structural checks over the whole atlas content graph.
 * Provenance-quality rules live in runContentAudit; this pipeline checks
 * that every cross-record reference, ordering claim, and manifest
 * membership resolves to a real record.
 */
export function validateAtlas(): AtlasValidationReport {
  const findings: AtlasValidationFinding[] = [];

  const sourceIds = new Set(knowledgeSources.map((source) => source.id));
  const starIds = new Set(seedStarSystems.map((star) => star.id));
  const bookIds = new Set(atlasBooks.map((book) => book.id));
  const scopeIds = new Set(atlasChapterScopes.map((scope) => scope.id));
  const bobIds = new Set(atlasBobInstances.map((bob) => bob.id));

  collectDuplicateIds("knowledge source", knowledgeSources, findings);
  collectDuplicateIds("star system", seedStarSystems, findings);
  collectDuplicateIds("book", atlasBooks, findings);
  collectDuplicateIds("chapter scope", atlasChapterScopes, findings);
  collectDuplicateIds("timeline event", atlasTimelineEvents, findings);
  collectDuplicateIds("bob instance", atlasBobInstances, findings);
  collectDuplicateIds("travel segment", atlasTravelSegments, findings);

  const seenOrders = new Set<number>();
  for (const book of atlasBooks) {
    if (seenOrders.has(book.order)) {
      addFinding(findings, {
        severity: "error",
        collection: "book",
        recordId: book.id,
        message: `duplicate release order: ${book.order}`,
      });
    }
    seenOrders.add(book.order);

    if (book.timelineStartYear > book.timelineEndYear) {
      addFinding(findings, {
        severity: "error",
        collection: "book",
        recordId: book.id,
        message: "timelineStartYear is after timelineEndYear",
      });
    }
  }

  for (const scope of atlasChapterScopes) {
    collectReferenceFindings("chapter scope", scope.id, [
      {
        field: "bookId",
        referencedId: scope.bookId,
        knownIds: bookIds,
        referencedLabel: "book",
      },
    ], findings);
  }

  for (const event of atlasTimelineEvents) {
    collectReferenceFindings("timeline event", event.id, [
      {
        field: "bookId",
        referencedId: event.bookId,
        knownIds: bookIds,
        referencedLabel: "book",
      },
      {
        field: "chapterScopeId",
        referencedId: event.chapterScopeId,
        knownIds: scopeIds,
        referencedLabel: "chapter scope",
      },
      {
        field: "starSystemId",
        referencedId: event.starSystemId,
        knownIds: starIds,
        referencedLabel: "star system",
      },
    ], findings);

    for (const bobId of event.bobIds) {
      if (!bobIds.has(bobId)) {
        addFinding(findings, {
          severity: "error",
          collection: "timeline event",
          recordId: event.id,
          message: `unknown bob instance reference: ${bobId} (field bobIds)`,
        });
      }
    }
  }

  for (const bob of atlasBobInstances) {
    collectReferenceFindings("bob instance", bob.id, [
      {
        field: "introducedInBookId",
        referencedId: bob.introducedInBookId,
        knownIds: bookIds,
        referencedLabel: "book",
      },
      {
        field: "revealedInScopeId",
        referencedId: bob.revealedInScopeId,
        knownIds: scopeIds,
        referencedLabel: "chapter scope",
      },
      {
        field: "homeSystemId",
        referencedId: bob.homeSystemId,
        knownIds: starIds,
        referencedLabel: "star system",
      },
      {
        field: "parentId",
        referencedId: bob.parentId,
        knownIds: bobIds,
        referencedLabel: "bob instance",
      },
    ], findings);

    const revealingScope = atlasChapterScopes.find(
      (scope) => scope.id === bob.revealedInScopeId,
    );
    if (revealingScope && revealingScope.bookId !== bob.introducedInBookId) {
      addFinding(findings, {
        severity: "error",
        collection: "bob instance",
        recordId: bob.id,
        message:
          "revealedInScopeId belongs to a different book than introducedInBookId",
      });
    }
  }

  for (const segment of atlasTravelSegments) {
    collectReferenceFindings("travel segment", segment.id, [
      {
        field: "bobId",
        referencedId: segment.bobId,
        knownIds: bobIds,
        referencedLabel: "bob instance",
      },
      {
        field: "bookId",
        referencedId: segment.bookId,
        knownIds: bookIds,
        referencedLabel: "book",
      },
      {
        field: "revealedInScopeId",
        referencedId: segment.revealedInScopeId,
        knownIds: scopeIds,
        referencedLabel: "chapter scope",
      },
      {
        field: "fromSystemId",
        referencedId: segment.fromSystemId,
        knownIds: starIds,
        referencedLabel: "star system",
      },
      {
        field: "toSystemId",
        referencedId: segment.toSystemId,
        knownIds: starIds,
        referencedLabel: "star system",
      },
    ], findings);

    if (segment.departureYear > segment.arrivalYear) {
      addFinding(findings, {
        severity: "error",
        collection: "travel segment",
        recordId: segment.id,
        message: "departureYear is after arrivalYear",
      });
    }

    const revealingScope = atlasChapterScopes.find(
      (scope) => scope.id === segment.revealedInScopeId,
    );
    if (revealingScope && revealingScope.bookId !== segment.bookId) {
      addFinding(findings, {
        severity: "error",
        collection: "travel segment",
        recordId: segment.id,
        message:
          "revealedInScopeId belongs to a different book than the route's bookId",
      });
    }
  }

  const manifest = atlasSeriesManifest;
  for (const bookId of manifest.bookIds) {
    if (!bookIds.has(bookId)) {
      addFinding(findings, {
        severity: "error",
        collection: "series manifest",
        recordId: manifest.id,
        message: `unknown book reference: ${bookId}`,
      });
    }
  }
  for (const scopeId of manifest.chapterScopeIds) {
    if (!scopeIds.has(scopeId)) {
      addFinding(findings, {
        severity: "error",
        collection: "series manifest",
        recordId: manifest.id,
        message: `unknown chapter scope reference: ${scopeId}`,
      });
    }
  }
  for (const sourceId of manifest.sourceIds) {
    if (!sourceIds.has(sourceId)) {
      addFinding(findings, {
        severity: "error",
        collection: "series manifest",
        recordId: manifest.id,
        message: `unknown source reference: ${sourceId}`,
      });
    }
  }

  for (const star of seedStarSystems) {
    if (star.raHours < 0 || star.raHours >= 24) {
      addFinding(findings, {
        severity: "error",
        collection: "star system",
        recordId: star.id,
        message: "raHours outside [0, 24)",
      });
    }
    if (star.decDegrees < -90 || star.decDegrees > 90) {
      addFinding(findings, {
        severity: "error",
        collection: "star system",
        recordId: star.id,
        message: "decDegrees outside [-90, 90]",
      });
    }
    collectReferenceFindings("star system", star.id, [
      {
        field: "noteScopeId",
        referencedId: star.noteScopeId,
        knownIds: scopeIds,
        referencedLabel: "chapter scope",
      },
    ], findings);
  }

  return {
    findings,
    counts: {
      sources: knowledgeSources.length,
      starSystems: seedStarSystems.length,
      books: atlasBooks.length,
      chapterScopes: atlasChapterScopes.length,
      events: atlasTimelineEvents.length,
      bobInstances: atlasBobInstances.length,
      travelSegments: atlasTravelSegments.length,
    },
  };
}

export function formatAtlasValidationReport(report: AtlasValidationReport) {
  const errors = report.findings.filter((f) => f.severity === "error");
  const warnings = report.findings.filter((f) => f.severity === "warning");

  const lines = [
    "Atlas validation summary",
    `- Sources: ${report.counts.sources}`,
    `- Star systems: ${report.counts.starSystems}`,
    `- Books: ${report.counts.books}`,
    `- Chapter scopes: ${report.counts.chapterScopes}`,
    `- Events: ${report.counts.events}`,
    `- Replicants: ${report.counts.bobInstances}`,
    `- Travel segments: ${report.counts.travelSegments}`,
    `- Findings: ${report.findings.length} (${errors.length} errors, ${warnings.length} warnings)`,
  ];

  if (report.findings.length > 0) {
    lines.push("Findings:");
    for (const finding of report.findings) {
      lines.push(formatAtlasFinding(finding));
    }
  } else {
    lines.push("Findings: none");
  }

  return lines.join("\n");
}

function formatAtlasFinding(finding: AtlasValidationFinding) {
  const suffix = finding.recordId ? ` ${finding.recordId}` : "";
  return `- ${finding.collection}${suffix}: ${finding.message}`;
}

export function assertAtlasHasNoErrors(report: AtlasValidationReport) {
  const errors = report.findings.filter((f) => f.severity === "error");
  if (errors.length > 0) {
    throw new Error(formatAtlasValidationReport(report));
  }
}

export type { Book, ChapterScope, StarSystem, TimelineEvent };
