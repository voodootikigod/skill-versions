import type { BudgetDiff, BudgetReport } from "../types.js";

export function formatJson(report: BudgetReport): string {
	return JSON.stringify(report, null, 2);
}

export function formatComparisonJson(diffs: BudgetDiff[]): string {
	return JSON.stringify(diffs, null, 2);
}
