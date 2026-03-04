import type { BaselineDiff, TestReport } from "../types.js";

/**
 * Format test reports as Markdown for PR comments.
 */
export function formatMarkdown(
	reports: TestReport[],
	baselineDiffs?: Map<string, BaselineDiff>,
): string {
	const lines: string[] = [];

	lines.push("# Skillsafe Test Report");
	lines.push("");

	if (reports.length === 0) {
		lines.push("No testable skills found.");
		lines.push("");
		return lines.join("\n");
	}

	// Summary table
	const totalPassed = reports.reduce((s, r) => s + r.passed, 0);
	const totalFailed = reports.reduce((s, r) => s + r.failed, 0);
	const totalSkipped = reports.reduce((s, r) => s + r.skipped, 0);
	const totalDuration = reports.reduce((s, r) => s + r.totalDuration, 0);

	lines.push("## Summary");
	lines.push("");
	lines.push("| Metric | Value |");
	lines.push("|--------|-------|");
	lines.push(`| Passed | ${totalPassed} |`);
	lines.push(`| Failed | ${totalFailed} |`);
	lines.push(`| Skipped | ${totalSkipped} |`);
	lines.push(`| Duration | ${(totalDuration / 1000).toFixed(1)}s |`);
	lines.push("");

	// Per-suite results
	for (const report of reports) {
		lines.push(`## ${report.suite}`);
		lines.push("");
		lines.push(`Skill: \`${report.skillPath}\``);
		lines.push("");
		lines.push("| Case | Type | Status | Pass Rate | Flaky |");
		lines.push("|------|------|--------|-----------|-------|");

		for (const c of report.cases) {
			const status = c.passed ? "PASS" : "FAIL";
			const rate = `${Math.round(c.passRate * 100)}%`;
			const flaky = c.flaky ? "Yes" : "No";
			lines.push(`| ${c.caseId} | ${c.type} | ${status} | ${rate} | ${flaky} |`);
		}

		lines.push("");

		// Baseline diff
		const diff = baselineDiffs?.get(report.skillPath);
		if (diff) {
			if (diff.regressions.length > 0) {
				lines.push("### Regressions");
				lines.push("");
				for (const r of diff.regressions) {
					lines.push(
						`- **${r.caseId}**: ${Math.round(r.wasPassRate * 100)}% -> ${Math.round(r.nowPassRate * 100)}%`,
					);
				}
				lines.push("");
			}
			if (diff.improvements.length > 0) {
				lines.push("### Improvements");
				lines.push("");
				for (const imp of diff.improvements) {
					lines.push(
						`- **${imp.caseId}**: ${Math.round(imp.wasPassRate * 100)}% -> ${Math.round(imp.nowPassRate * 100)}%`,
					);
				}
				lines.push("");
			}
		}
	}

	return lines.join("\n");
}
