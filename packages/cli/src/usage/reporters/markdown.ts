import type { UsageReport } from "../analyzer.js";
import type { UsagePolicyViolation } from "../policy-check.js";

export function formatUsageMarkdown(report: UsageReport): string {
	const lines: string[] = [];
	const periodStr =
		report.period.since || report.period.until
			? `${report.period.since ?? "..."} to ${report.period.until ?? "now"}`
			: "all time";

	lines.push(`# Skills Usage Report (${periodStr})`);
	lines.push("");

	if (report.skills.length === 0) {
		lines.push("No skill usage found.");
		return lines.join("\n");
	}

	lines.push("| Skill | Calls | Tokens/call | Est. Cost | Version(s) |");
	lines.push("|-------|-------|-------------|-----------|------------|");

	for (const skill of report.skills) {
		const versionStr = skill.versions.join(", ");
		const drift = skill.hasVersionDrift ? " ⚠" : "";
		lines.push(
			`| ${skill.name} | ${skill.totalCalls.toLocaleString()} | ${skill.avgTokensPerCall.toLocaleString()} | $${skill.estimatedCost.toFixed(2)} | ${versionStr}${drift} |`,
		);
	}

	lines.push("");
	lines.push(
		`**Total:** ${report.totalCalls.toLocaleString()} calls, ~$${report.totalEstimatedCost.toFixed(2)} estimated cost`,
	);

	return lines.join("\n");
}

export function formatUsageMarkdownWithPolicy(
	report: UsageReport,
	violations: UsagePolicyViolation[],
): string {
	let output = formatUsageMarkdown(report);

	if (violations.length > 0) {
		output += "\n\n## Policy Violations\n\n";
		for (const v of violations) {
			const icon = v.severity === "critical" ? "🔴" : "🟡";
			output += `- ${icon} **[${v.severity}]** ${v.message}\n`;
		}
	}

	return output;
}
