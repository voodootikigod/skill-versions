import type { VerifyReport } from "../types.js";

export function formatVerifyJson(report: VerifyReport): string {
	return JSON.stringify(report, null, 2);
}
