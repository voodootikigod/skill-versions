import type { AuditReport } from "../types.js";

export function formatJson(report: AuditReport): string {
	return JSON.stringify(report, null, 2);
}
