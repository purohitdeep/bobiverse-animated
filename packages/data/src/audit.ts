import type {
  Book,
  BobInstance,
  ChapterScope,
  KnowledgeSource,
  ReviewStatus,
  StarSystem,
  TimelineEvent,
  TravelSegment,
} from "@bobiverse/domain";
import {
  atlasBobInstances,
  atlasBooks,
  atlasChapterScopes,
  atlasTimelineEvents,
  atlasTravelSegments,
  knowledgeSources,
  seedStarSystems,
} from "./index.ts";

type AuditSeverity = "error" | "warning";

interface AuditableRecord {
  id: string;
  sourceIds: string[];
  reviewStatus: ReviewStatus;
  evidenceNote?: string | undefined;
}

interface AuditCollection<TRecord extends AuditableRecord> {
  label: string;
  records: TRecord[];
}

export interface ContentAuditFinding {
  severity: AuditSeverity;
  collection: string;
  message: string;
  recordId?: string;
}

export interface ContentAuditSummary {
  sourceCount: number;
  recordCount: number;
  reviewStatusCounts: Record<ReviewStatus, number>;
  authorityCounts: Record<KnowledgeSource["authority"], number>;
}

export interface ContentAuditReport {
  summary: ContentAuditSummary;
  findings: ContentAuditFinding[];
}

const STATUS_ORDER: ReviewStatus[] = [
  "canonical",
  "verified",
  "pending-review",
  "disputed",
  "deprecated",
];

function createEmptyStatusCounts(): Record<ReviewStatus, number> {
  return {
    canonical: 0,
    verified: 0,
    "pending-review": 0,
    disputed: 0,
    deprecated: 0,
  };
}

function createEmptyAuthorityCounts(): Record<
  KnowledgeSource["authority"],
  number
> {
  return {
    primary: 0,
    secondary: 0,
    reference: 0,
  };
}

function auditCollection<TRecord extends AuditableRecord>(
  collection: AuditCollection<TRecord>,
  sourceById: Map<string, KnowledgeSource>,
  findings: ContentAuditFinding[],
  summary: ContentAuditSummary,
) {
  let pendingReviewCount = 0;
  let disputedCount = 0;

  for (const record of collection.records) {
    summary.recordCount += 1;
    summary.reviewStatusCounts[record.reviewStatus] += 1;

    const resolvedSources = record.sourceIds
      .map((sourceId) => sourceById.get(sourceId))
      .filter((source): source is KnowledgeSource => source !== undefined);

    const hasPrimarySource = resolvedSources.some(
      (source) => source.authority === "primary",
    );
    const hasReferenceSource = resolvedSources.some(
      (source) => source.authority === "reference",
    );
    const hasOnlySecondarySources =
      resolvedSources.length > 0 &&
      resolvedSources.every((source) => source.authority === "secondary");

    if (record.reviewStatus === "canonical" && !hasPrimarySource) {
      findings.push({
        severity: "error",
        collection: collection.label,
        recordId: record.id,
        message: "canonical records must cite at least one primary source",
      });
    }

    if (
      record.reviewStatus === "verified" &&
      !(hasPrimarySource || hasReferenceSource)
    ) {
      findings.push({
        severity: "error",
        collection: collection.label,
        recordId: record.id,
        message: "verified records must cite a primary or reference source",
      });
    }

    if (
      (record.reviewStatus === "pending-review" ||
        record.reviewStatus === "disputed") &&
      !record.evidenceNote
    ) {
      findings.push({
        severity: "error",
        collection: collection.label,
        recordId: record.id,
        message: "provisional records must include an evidence note",
      });
    }

    if (
      (record.reviewStatus === "canonical" ||
        record.reviewStatus === "verified") &&
      hasOnlySecondarySources
    ) {
      findings.push({
        severity: "error",
        collection: collection.label,
        recordId: record.id,
        message: "trusted records cannot rely on secondary sources alone",
      });
    }

    if (
      (record.reviewStatus === "pending-review" ||
        record.reviewStatus === "disputed") &&
      hasOnlySecondarySources
    ) {
      findings.push({
        severity: "warning",
        collection: collection.label,
        recordId: record.id,
        message: "record currently relies on secondary sources only",
      });
    }

    if (record.reviewStatus === "pending-review") {
      pendingReviewCount += 1;
    }

    if (record.reviewStatus === "disputed") {
      disputedCount += 1;
    }
  }

  if (pendingReviewCount > 0) {
    findings.push({
      severity: "warning",
      collection: collection.label,
      message: `${pendingReviewCount} record(s) remain pending review`,
    });
  }

  if (disputedCount > 0) {
    findings.push({
      severity: "warning",
      collection: collection.label,
      message: `${disputedCount} record(s) are explicitly disputed`,
    });
  }
}

export function runContentAudit(): ContentAuditReport {
  const sourceById = new Map(
    knowledgeSources.map((source) => [source.id, source]),
  );
  const summary: ContentAuditSummary = {
    sourceCount: knowledgeSources.length,
    recordCount: 0,
    reviewStatusCounts: createEmptyStatusCounts(),
    authorityCounts: createEmptyAuthorityCounts(),
  };

  for (const source of knowledgeSources) {
    summary.authorityCounts[source.authority] += 1;
  }

  const findings: ContentAuditFinding[] = [];
  const collections: Array<
    AuditCollection<
      Book | BobInstance | ChapterScope | StarSystem | TimelineEvent | TravelSegment
    >
  > = [
    { label: "star system", records: seedStarSystems },
    { label: "book", records: atlasBooks },
    { label: "chapter scope", records: atlasChapterScopes },
    { label: "timeline event", records: atlasTimelineEvents },
    { label: "bob instance", records: atlasBobInstances },
    { label: "travel segment", records: atlasTravelSegments },
  ];

  for (const collection of collections) {
    auditCollection(collection, sourceById, findings, summary);
  }

  return { summary, findings };
}

export function formatContentAuditReport(report: ContentAuditReport) {
  const { summary, findings } = report;
  const errors = findings.filter((finding) => finding.severity === "error");
  const warnings = findings.filter((finding) => finding.severity === "warning");

  const lines = [
    "Content audit summary",
    `- Sources cataloged: ${summary.sourceCount}`,
    `- Records audited: ${summary.recordCount}`,
    "- Review status counts:",
    ...STATUS_ORDER.map(
      (status) => `  - ${status}: ${summary.reviewStatusCounts[status]}`,
    ),
    "- Source authority counts:",
    `  - primary: ${summary.authorityCounts.primary}`,
    `  - secondary: ${summary.authorityCounts.secondary}`,
    `  - reference: ${summary.authorityCounts.reference}`,
  ];

  if (errors.length > 0) {
    lines.push("Errors:");
    for (const finding of errors) {
      lines.push(formatFinding(finding));
    }
  } else {
    lines.push("Errors: none");
  }

  if (warnings.length > 0) {
    lines.push("Warnings:");
    for (const finding of warnings) {
      lines.push(formatFinding(finding));
    }
  } else {
    lines.push("Warnings: none");
  }

  return lines.join("\n");
}

function formatFinding(finding: ContentAuditFinding) {
  const recordSuffix = finding.recordId ? ` ${finding.recordId}` : "";
  return `- ${finding.collection}${recordSuffix}: ${finding.message}`;
}

export function assertContentAuditHasNoErrors(report: ContentAuditReport) {
  const errors = report.findings.filter(
    (finding) => finding.severity === "error",
  );
  if (errors.length > 0) {
    throw new Error(formatContentAuditReport(report));
  }
}
