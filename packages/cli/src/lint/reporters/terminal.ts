import chalk from "chalk";
import type { LintFinding, LintReport } from "../types.js";

function levelColor(level: LintFinding["level"]) {
	switch (level) {
		case "error":
			return chalk.red;
		case "warning":
			return chalk.yellow;
		case "info":
			return chalk.blue;
		default:
			return chalk.dim;
	}
}

function levelIcon(level: LintFinding["level"]): string {
	switch (level) {
		case "error":
			return "\u2717";
		case "warning":
			return "\u26A0";
		case "info":
			return "\u2139";
		default:
			return " ";
	}
}

function groupByFile(findings: LintFinding[]): Map<string, LintFinding[]> {
	const groups = new Map<string, LintFinding[]>();
	for (const f of findings) {
		const existing = groups.get(f.file) ?? [];
		existing.push(f);
		groups.set(f.file, existing);
	}
	return groups;
}

export function formatLintTerminal(report: LintReport): string {
	const lines: string[] = [];

	lines.push("");
	lines.push(chalk.bold("skillsafe lint"));
	lines.push("=".repeat(50));
	lines.push("");

	if (report.findings.length === 0 && report.fixed === 0) {
		lines.push(chalk.green("No findings. All skill files have valid metadata."));
		lines.push("");
		lines.push(`  ${report.files} file(s) scanned`);
		lines.push("");
		return lines.join("\n");
	}

	// Group findings by file
	const grouped = groupByFile(report.findings);
	const levelOrder: Record<LintFinding["level"], number> = {
		error: 0,
		warning: 1,
		info: 2,
	};

	for (const [file, findings] of grouped) {
		lines.push(chalk.bold.underline(file));
		lines.push("");

		// Sort by level (error first), then by field name
		findings.sort(
			(a, b) => levelOrder[a.level] - levelOrder[b.level] || a.field.localeCompare(b.field)
		);

		for (const f of findings) {
			const color = levelColor(f.level);
			const icon = levelIcon(f.level);
			const fixTag = f.fixable ? chalk.dim(" [fixable]") : "";
			lines.push(
				`  ${color(icon)} ${color(f.level.toUpperCase().padEnd(7))} ${chalk.cyan(f.field.padEnd(16))} ${chalk.dim("|")} ${f.message}${fixTag}`
			);
		}
		lines.push("");
	}

	// Summary
	lines.push(chalk.bold("Summary"));
	lines.push("=".repeat(50));
	if (report.errors > 0) {
		lines.push(chalk.red(`  Errors:   ${report.errors}`));
	}
	if (report.warnings > 0) {
		lines.push(chalk.yellow(`  Warnings: ${report.warnings}`));
	}
	if (report.infos > 0) {
		lines.push(chalk.blue(`  Info:     ${report.infos}`));
	}
	if (report.fixed > 0) {
		lines.push(chalk.green(`  Fixed:    ${report.fixed}`));
	}
	lines.push(`  Total:    ${report.errors + report.warnings + report.infos}`);
	lines.push("");
	lines.push(`  ${report.files} file(s) scanned`);
	lines.push("");

	return lines.join("\n");
}
