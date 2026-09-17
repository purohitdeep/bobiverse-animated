import {
  assertContentAuditHasNoErrors,
  formatContentAuditReport,
  runContentAudit,
} from "./audit.ts";

const report = runContentAudit();

console.log(formatContentAuditReport(report));

assertContentAuditHasNoErrors(report);
