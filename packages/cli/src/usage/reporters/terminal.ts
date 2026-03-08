import chalk from "chalk";
import type { UsageReport } from "../analyzer.js";
import type { UsagePolicyViolation } from "../policy-check.js";

export function formatUsageTerminal(report: UsageReport): string {
	const lines: string[] = [];
	const periodStr = report.period.since || report.period.until
		? `${report.period.since ?? "..."} to ${report.period.until ?? "now"}`
		: "all time";

	lines.push(chalk.bold(`Skills Usage Report (${periodStr})`));
	lines.push("═".repeat(70));
	lines.push("");

	if (report.skills.length === 0) {
		lines.push(chalk.dim("  No skill usage found."));
		return lines.join("\n");
	}

	lines.push(
		`  ${chalk.dim("Skill".padEnd(25))}${chalk.dim("Calls".padEnd(10))}${chalk.dim("Tokens/call".padEnd(14))}${chalk.dim("Est. Cost".padEnd(12))}${chalk.dim("Version(s)")}`,
	);
	lines.push(`  ${"─".repeat(25)}${"─".repeat(10)}${"─".repeat(14)}${"─".repeat(12)}${"─".repeat(15)}`);

	for (const skill of report.skills) {
		const versionStr = skill.versions.join(", ");
		const drift = skill.hasVersionDrift ? chalk.yellow(" ⚠") : "";
		const name = `${skill.name}`.padEnd(25);
		const calls = skill.totalCalls.toLocaleString().padEnd(10);
		const avgTokens = skill.avgTokensPerCall.toLocaleString().padEnd(14);
		const cost = `$${skill.estimatedCost.toFixed(2)}`.padEnd(12);

		lines.push(`  ${name}${calls}${avgTokens}${cost}${versionStr}${drift}`);
	}

	lines.push("");
	lines.push(
		`  ${chalk.yellow("⚠")} = multiple versions in use or version drift detected`,
	);
	lines.push(
		`  ${chalk.bold("Total:")} ${report.totalCalls.toLocaleString()} calls, ~$${report.totalEstimatedCost.toFixed(2)} estimated cost`,
	);

	return lines.join("\n");
}

export function formatUsageTerminalWithPolicy(
	report: UsageReport,
	violations: UsagePolicyViolation[],
): string {
	let output = formatUsageTerminal(report);

	if (violations.length > 0) {
		const lines: string[] = ["", "", chalk.bold.red("Policy Violations"), "─".repeat(50)];
		for (const v of violations) {
			const icon = v.severity === "critical" ? chalk.red("✗") : chalk.yellow("!");
			lines.push(`  ${icon} [${v.severity}] ${v.message}`);
		}
		output += `\n${lines.join("\n")}`;
	}

	return output;
}
