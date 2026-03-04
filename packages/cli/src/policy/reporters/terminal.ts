import chalk from "chalk";
import type { PolicyFinding, PolicyReport } from "../types.js";

function groupByFile(findings: PolicyFinding[]): Map<string, PolicyFinding[]> {
	const groups = new Map<string, PolicyFinding[]>();
	for (const f of findings) {
		const existing = groups.get(f.file) ?? [];
		existing.push(f);
		groups.set(f.file, existing);
	}
	return groups;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
export function formatPolicyTerminal(report: PolicyReport): string {
	const lines: string[] = [];

	lines.push("");
	lines.push(chalk.bold(`Policy Check: ${report.policyFile}`));
	lines.push("=".repeat(50));
	lines.push("");

	const blocked = report.findings.filter((f) => f.severity === "blocked");
	const violations = report.findings.filter((f) => f.severity === "violation");
	const warnings = report.findings.filter((f) => f.severity === "warning");

	// BLOCKED section
	if (blocked.length > 0) {
		lines.push(chalk.red.bold(`BLOCKED (${blocked.length}):`));
		const grouped = groupByFile(blocked);
		for (const [file, findings] of grouped) {
			for (const f of findings) {
				const lineRef = f.line ? ` (line ${f.line})` : "";
				lines.push(`  ${chalk.red("X")} ${chalk.bold(file)}${lineRef}`);
				lines.push(`    ${f.message}`);
				if (f.detail) {
					lines.push(`    ${chalk.dim(f.detail)}`);
				}
			}
		}
		lines.push("");
	}

	// VIOLATIONS section
	if (violations.length > 0) {
		lines.push(chalk.yellow(`VIOLATIONS (${violations.length}):`));
		const grouped = groupByFile(violations);
		for (const [file, findings] of grouped) {
			for (const f of findings) {
				const lineRef = f.line ? ` (line ${f.line})` : "";
				lines.push(`  ${chalk.yellow("!")} ${chalk.bold(file)}${lineRef}`);
				lines.push(`    ${f.message}`);
				if (f.detail) {
					lines.push(`    ${chalk.dim(f.detail)}`);
				}
			}
		}
		lines.push("");
	}

	// WARNINGS section
	if (warnings.length > 0) {
		lines.push(chalk.dim.yellow(`WARNINGS (${warnings.length}):`));
		const grouped = groupByFile(warnings);
		for (const [file, findings] of grouped) {
			for (const f of findings) {
				lines.push(`  ${chalk.dim("*")} ${chalk.dim(file)}`);
				lines.push(`    ${chalk.dim(f.message)}`);
				if (f.detail) {
					lines.push(`    ${chalk.dim(f.detail)}`);
				}
			}
		}
		lines.push("");
	}

	// REQUIRED section
	if (report.required.length > 0) {
		const allSatisfied = report.required.every((r) => r.satisfied);
		lines.push(allSatisfied ? chalk.green("REQUIRED (all satisfied):") : chalk.yellow("REQUIRED:"));
		for (const r of report.required) {
			if (r.satisfied) {
				lines.push(`  ${chalk.green("+")} ${r.skill} installed`);
			} else {
				lines.push(`  ${chalk.red("X")} ${r.skill} ${chalk.red("MISSING")}`);
			}
		}
		lines.push("");
	}

	// No findings
	if (report.findings.length === 0 && report.required.every((r) => r.satisfied)) {
		lines.push(chalk.green("All skills comply with policy."));
		lines.push("");
		lines.push(`  ${report.files} file(s) checked`);
		lines.push("");
		return lines.join("\n");
	}

	// Summary
	const { summary } = report;
	const total = summary.blocked + summary.violations + summary.warnings;
	const passed = total === 0 && report.required.every((r) => r.satisfied);

	lines.push(
		`Summary: ${summary.blocked} blocked, ${summary.violations} violation(s), ${summary.warnings} warning(s). ` +
			`Policy check ${passed ? chalk.green("PASSED") : chalk.red("FAILED")}.`
	);
	lines.push("");

	return lines.join("\n");
}
