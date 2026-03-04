import chalk from "chalk";
import type { BudgetDiff, BudgetReport } from "../types.js";

function formatNumber(n: number): string {
	return n.toLocaleString("en-US");
}

function formatPercent(tokens: number, contextWindow: number): string {
	const pct = (tokens / contextWindow) * 100;
	return `${pct.toFixed(1)}%`;
}

function formatCost(cost: number): string {
	return `$${cost.toFixed(3)}`;
}

function percentColor(tokens: number, contextWindow: number): typeof chalk {
	const pct = (tokens / contextWindow) * 100;
	if (pct >= 50) {
		return chalk.red;
	}
	if (pct >= 25) {
		return chalk.yellow;
	}
	return chalk.green;
}

export function formatTerminal(report: BudgetReport, detailed = false): string {
	const lines: string[] = [];

	lines.push("");
	lines.push(chalk.bold("Context Budget Report"));
	lines.push("=".repeat(70));
	lines.push("");

	if (report.skills.length === 0) {
		lines.push(chalk.dim("No skill files found."));
		lines.push("");
		return lines.join("\n");
	}

	// Header
	const nameWidth = 30;
	const tokensWidth = 10;
	const pctWidth = 12;
	const costWidth = 18;

	lines.push(
		`${chalk.dim("Skill".padEnd(nameWidth))}${chalk.dim("Tokens".padStart(tokensWidth))}${chalk.dim("% of 128K".padStart(pctWidth))}${chalk.dim("Est. Cost/1K calls".padStart(costWidth))}`
	);
	lines.push(chalk.dim("-".repeat(70)));

	for (const skill of report.skills) {
		const color = percentColor(skill.totalTokens, report.contextWindow);
		const pct = formatPercent(skill.totalTokens, report.contextWindow);

		const perSkillCost = (skill.totalTokens / 1_000_000) * getModelPrice(report.cost.model) * 1000;

		lines.push(
			`${skill.name.padEnd(nameWidth)}${formatNumber(skill.totalTokens).padStart(tokensWidth)}${color(pct).padStart(pctWidth + 10)}${formatCost(perSkillCost).padStart(costWidth)}`
		);

		if (detailed) {
			for (const section of skill.sections) {
				lines.push(
					`  ${chalk.dim(section.heading.padEnd(nameWidth - 2))}${chalk.dim(formatNumber(section.tokens).padStart(tokensWidth))}${chalk.dim(`${section.percentage}%`.padStart(pctWidth))}`
				);
			}
		}
	}

	// Total row
	lines.push(chalk.dim("-".repeat(70)));
	const totalPct = formatPercent(report.totalTokens, report.contextWindow);
	const totalColor = percentColor(report.totalTokens, report.contextWindow);
	lines.push(
		`${chalk.bold("Total".padEnd(nameWidth))}${chalk.bold(formatNumber(report.totalTokens).padStart(tokensWidth))}${totalColor(totalPct).padStart(pctWidth + 10)}${chalk.bold(formatCost(report.cost.costPer1KLoads).padStart(costWidth))}`
	);
	lines.push("");

	// Redundancy warnings
	if (report.redundancy.length > 0) {
		lines.push(chalk.bold.yellow("Redundancy detected:"));
		for (const match of report.redundancy) {
			lines.push(`  ${chalk.yellow("*")} ${match.suggestion}`);
		}
		lines.push("");
	}

	// Budget summary
	lines.push(
		`Budget: ${formatNumber(report.totalTokens)} / ${formatNumber(report.contextWindow)} tokens (${totalColor(totalPct)} of context used by skills)`
	);
	lines.push("");

	return lines.join("\n");
}

function getDeltaColor(delta: number): typeof chalk {
	return delta < 0 ? chalk.green : chalk.dim;
}

export function formatComparisonTerminal(diffs: BudgetDiff[]): string {
	const lines: string[] = [];

	lines.push("");
	lines.push(chalk.bold("Budget Comparison"));
	lines.push("=".repeat(70));
	lines.push("");

	if (diffs.length === 0) {
		lines.push(chalk.dim("No changes detected."));
		lines.push("");
		return lines.join("\n");
	}

	for (const diff of diffs) {
		const sign = diff.delta > 0 ? "+" : "";
		const color = diff.delta > 0 ? chalk.red : getDeltaColor(diff.delta);
		const improved = diff.delta < 0 ? chalk.green(" (improved)") : "";

		lines.push(
			`  ${diff.skill.padEnd(25)} ${formatNumber(diff.before).padStart(8)} -> ${formatNumber(diff.after).padStart(8)} ${color(`(${sign}${formatNumber(diff.delta)} tokens, ${sign}${diff.percentChange}%)`)}${improved}`
		);
	}

	// Total
	const totalBefore = diffs.reduce((s, d) => s + d.before, 0);
	const totalAfter = diffs.reduce((s, d) => s + d.after, 0);
	const totalDelta = totalAfter - totalBefore;
	const totalSign = totalDelta > 0 ? "+" : "";
	const totalPctChange = totalBefore > 0 ? (totalDelta / totalBefore) * 100 : 0;
	const totalColor = totalDelta > 0 ? chalk.red : getDeltaColor(totalDelta);

	lines.push("");
	lines.push(
		`  ${chalk.bold("Total".padEnd(25))} ${formatNumber(totalBefore).padStart(8)} -> ${formatNumber(totalAfter).padStart(8)} ${totalColor(`(${totalSign}${formatNumber(totalDelta)} tokens, ${totalSign}${totalPctChange.toFixed(1)}%)`)}`
	);
	lines.push("");

	return lines.join("\n");
}

/** Simple lookup — duplicated from cost.ts to avoid circular deps. */
function getModelPrice(model: string): number {
	const prices: Record<string, number> = {
		"claude-opus": 15.0,
		"claude-sonnet": 3.0,
		"claude-haiku": 0.25,
		"gpt-4o": 2.5,
	};
	return prices[model] ?? 3.0;
}
