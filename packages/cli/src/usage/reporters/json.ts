import type { UsageReport } from "../analyzer.js";
import type { UsagePolicyViolation } from "../policy-check.js";

export function formatUsageJson(report: UsageReport): string {
	return JSON.stringify(report, null, 2);
}

export function formatUsageJsonWithPolicy(
	report: UsageReport,
	violations: UsagePolicyViolation[],
): string {
	return JSON.stringify({ report, policyViolations: violations }, null, 2);
}
