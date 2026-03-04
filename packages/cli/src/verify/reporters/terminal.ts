import chalk from "chalk";
import type { VerifyReport, VerifyResult } from "../types.js";

function assessmentIcon(match: boolean): string {
	return match ? chalk.green("[PASS]") : chalk.red("[FAIL]");
}

function bumpColor(bump: string): string {
	switch (bump) {
		case "major":
			return chalk.red.bold(bump);
		case "minor":
			return chalk.yellow(bump);
		case "patch":
			return chalk.blue(bump);
		default:
			return chalk.dim(bump);
	}
}

function formatResult(result: VerifyResult): string[] {
	const lines: string[] = [];

	lines.push(chalk.bold(`Version Verification: ${result.skill}`));
	lines.push("=".repeat(50));
	lines.push("");

	if (result.declaredBump) {
		lines.push(
			`  Declared change: ${result.declaredBefore ?? "?"} -> ${result.declaredAfter ?? "?"} (${bumpColor(result.declaredBump)})`
		);
	} else {
		lines.push(chalk.dim("  No previous version for comparison"));
	}
	lines.push("");

	lines.push("  Content analysis:");
	for (const signal of result.signals) {
		const icon = signal.source === "llm" ? chalk.magenta("*") : chalk.dim("-");
		const conf = chalk.dim(`(${(signal.confidence * 100).toFixed(0)}%)`);
		lines.push(`    ${icon} ${signal.reason} ${conf} -> ${bumpColor(signal.type)}`);
	}
	lines.push("");

	if (result.declaredBump) {
		const icon = assessmentIcon(result.match);
		const bumpLabel = result.assessedBump.toUpperCase();
		if (result.match) {
			lines.push(`  Assessment: ${icon} ${bumpLabel} bump is appropriate`);
		} else {
			lines.push(
				`  Assessment: ${icon} ${result.declaredBump.toUpperCase()} bump appears ${result.assessedBump > result.declaredBump ? "INSUFFICIENT" : "EXCESSIVE"}`
			);
			lines.push(`    Recommended: ${bumpColor(result.assessedBump)} bump`);
		}
	} else {
		lines.push(
			`  Suggested bump: ${bumpColor(result.assessedBump)} (${result.assessedBump.toUpperCase()})`
		);
	}

	if (result.explanation) {
		lines.push(`    ${chalk.dim(result.explanation)}`);
	}

	if (result.llmUsed) {
		lines.push(chalk.dim("    * LLM-assisted analysis"));
	}

	lines.push("");
	return lines;
}

export function formatVerifyTerminal(report: VerifyReport): string {
	const lines: string[] = [];

	lines.push("");
	lines.push(chalk.bold("skillsafe verify"));
	lines.push("=".repeat(50));
	lines.push("");

	if (report.results.length === 0) {
		lines.push(chalk.dim("No skills found to verify."));
		lines.push("");
		return lines.join("\n");
	}

	for (const result of report.results) {
		lines.push(...formatResult(result));
	}

	// Summary
	lines.push(chalk.bold("Summary"));
	lines.push("-".repeat(50));
	if (report.summary.passed > 0) {
		lines.push(chalk.green(`  Passed:  ${report.summary.passed}`));
	}
	if (report.summary.failed > 0) {
		lines.push(chalk.red(`  Failed:  ${report.summary.failed}`));
	}
	if (report.summary.skipped > 0) {
		lines.push(chalk.dim(`  Skipped: ${report.summary.skipped}`));
	}
	lines.push(
		`  Total:   ${report.summary.passed + report.summary.failed + report.summary.skipped}`
	);
	lines.push("");

	return lines.join("\n");
}
