import type { TestReport } from "../types.js";

/**
 * Format test reports as JSON.
 */
export function formatJson(reports: TestReport[]): string {
	return JSON.stringify(reports, null, 2);
}
