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

export function formatMarkdown(report: BudgetReport, detailed = false): string {
	const lines: string[] = [];
	const now = report.generatedAt.split("T")[0];

	lines.push("# Context Budget Report");
	lines.push("");
	lines.push(`Generated: ${now}`);
	lines.push("");

	if (report.skills.length === 0) {
		lines.push("No skill files found.");
		lines.push("");
		return lines.join("\n");
	}

	// Summary table
	lines.push("## Skills");
	lines.push("");
	lines.push("| Skill | Tokens | % of 128K | Est. Cost/1K calls |");
	lines.push("|-------|-------:|----------:|-------------------:|");

	for (const skill of report.skills) {
		const pct = formatPercent(skill.totalTokens, report.contextWindow);
		const perSkillCost = (skill.totalTokens / 1_000_000) * getModelPrice(report.cost.model) * 1000;

		lines.push(
			`| ${skill.name} | ${formatNumber(skill.totalTokens)} | ${pct} | ${formatCost(perSkillCost)} |`
		);

		if (detailed) {
			for (const section of skill.sections) {
				lines.push(
					`| -- ${section.heading} | ${formatNumber(section.tokens)} | ${section.percentage}% | |`
				);
			}
		}
	}

	// Total row
	const totalPct = formatPercent(report.totalTokens, report.contextWindow);
	lines.push(
		`| **Total** | **${formatNumber(report.totalTokens)}** | **${totalPct}** | **${formatCost(report.cost.costPer1KLoads)}** |`
	);
	lines.push("");

	// Cost info
	lines.push(`Model: ${report.cost.model}`);
	lines.push("");

	// Redundancy section
	if (report.redundancy.length > 0) {
		lines.push("## Redundancy");
		lines.push("");
		for (const match of report.redundancy) {
			lines.push(`- ${match.suggestion}`);
		}
		lines.push("");
	}

	// Budget summary
	lines.push("## Summary");
	lines.push("");
	lines.push(
		`Budget: ${formatNumber(report.totalTokens)} / ${formatNumber(report.contextWindow)} tokens (${totalPct} of context used by skills)`
	);
	lines.push("");

	return lines.join("\n");
}

export function formatComparisonMarkdown(diffs: BudgetDiff[]): string {
	const lines: string[] = [];

	lines.push("# Budget Comparison");
	lines.push("");

	if (diffs.length === 0) {
		lines.push("No changes detected.");
		lines.push("");
		return lines.join("\n");
	}

	lines.push("| Skill | Before | After | Delta | Change |");
	lines.push("|-------|-------:|------:|------:|-------:|");

	for (const diff of diffs) {
		const sign = diff.delta > 0 ? "+" : "";
		lines.push(
			`| ${diff.skill} | ${formatNumber(diff.before)} | ${formatNumber(diff.after)} | ${sign}${formatNumber(diff.delta)} | ${sign}${diff.percentChange}% |`
		);
	}

	// Total row
	const totalBefore = diffs.reduce((s, d) => s + d.before, 0);
	const totalAfter = diffs.reduce((s, d) => s + d.after, 0);
	const totalDelta = totalAfter - totalBefore;
	const totalSign = totalDelta > 0 ? "+" : "";
	const totalPctChange = totalBefore > 0 ? (totalDelta / totalBefore) * 100 : 0;

	lines.push(
		`| **Total** | **${formatNumber(totalBefore)}** | **${formatNumber(totalAfter)}** | **${totalSign}${formatNumber(totalDelta)}** | **${totalSign}${totalPctChange.toFixed(1)}%** |`
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
