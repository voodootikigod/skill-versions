import type { LintReport } from "../types.js";

export function formatLintJson(report: LintReport): string {
	return JSON.stringify(report, null, 2);
}
