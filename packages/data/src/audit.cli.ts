import {
  assertContentAuditHasNoErrors,
  formatContentAuditReport,
  runContentAudit,
} from "./audit.ts";
import {
  assertAtlasHasNoErrors,
  formatAtlasValidationReport,
  validateAtlas,
} from "./validate.ts";

const auditReport = runContentAudit();
console.log(formatContentAuditReport(auditReport));
assertContentAuditHasNoErrors(auditReport);

const validationReport = validateAtlas();
console.log(formatAtlasValidationReport(validationReport));
assertAtlasHasNoErrors(validationReport);
