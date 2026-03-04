import type { PolicyReport } from "../types.js";

export function formatPolicyJson(report: PolicyReport): string {
	return JSON.stringify(report, null, 2);
}
