import { analyzeUsage } from "./analyzer.js";
import type { UsageReport } from "./analyzer.js";
import { checkUsagePolicy } from "./policy-check.js";
import type { UsagePolicyViolation } from "./policy-check.js";
import { createReader } from "./readers/index.js";

export type { UsageReport } from "./analyzer.js";
export type { UsagePolicyViolation } from "./policy-check.js";

export interface UsageOptions {
	checkPolicy?: boolean;
	ci?: boolean;
	detailed?: boolean;
	failOn?: string;
	json?: boolean;
	markdown?: boolean;
	output?: string;
	policyFile?: string;
	since?: string;
	store?: string;
	until?: string;
}

export interface UsageResult {
	report: UsageReport;
	violations: UsagePolicyViolation[];
}

/**
 * Run the usage analysis pipeline.
 *
 * 1. Create reader from store URI
 * 2. Read telemetry events (with date filtering)
 * 3. Analyze into usage report
 * 4. Optionally cross-reference with policy
 */
export async function runUsage(options: UsageOptions = {}): Promise<UsageResult> {
	const storeUri = options.store ?? "file://./telemetry.jsonl";

	const reader = await createReader(storeUri);

	try {
		const readerOptions: { since?: Date; until?: Date } = {};
		if (options.since) readerOptions.since = new Date(options.since);
		if (options.until) readerOptions.until = new Date(options.until);

		const events = await reader.read(readerOptions);
		const report = analyzeUsage(events, {
			since: options.since,
			until: options.until,
		});

		let violations: UsagePolicyViolation[] = [];
		if (options.checkPolicy) {
			violations = await checkUsagePolicy(report, options.policyFile);
		}

		return { report, violations };
	} finally {
		await reader.close();
	}
}
