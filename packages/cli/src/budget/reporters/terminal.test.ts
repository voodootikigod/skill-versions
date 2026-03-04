import { describe, expect, it } from "vitest";
import type { BudgetDiff, BudgetReport } from "../types.js";
import { formatComparisonTerminal, formatTerminal } from "./terminal.js";

function makeReport(overrides?: Partial<BudgetReport>): BudgetReport {
	return {
		skills: [],
		totalTokens: 0,
		contextWindow: 128_000,
		cost: { model: "claude-sonnet", costPer1KLoads: 0, tokens: 0 },
		redundancy: [],
		generatedAt: "2026-03-03T00:00:00.000Z",
		...overrides,
	};
}

describe("formatTerminal", () => {
	it("shows empty message when no skills found", () => {
		const output = formatTerminal(makeReport());
		expect(output).toContain("No skill files found");
	});

	it("includes header", () => {
		const output = formatTerminal(makeReport());
		expect(output).toContain("Context Budget Report");
	});

	it("displays skill name and token count", () => {
		const report = makeReport({
			skills: [
				{
					path: "/skills/test/SKILL.md",
					name: "test-skill",
					totalTokens: 2340,
					sections: [{ heading: "Main", tokens: 2340, percentage: 100 }],
				},
			],
			totalTokens: 2340,
			cost: { model: "claude-sonnet", costPer1KLoads: 0.007, tokens: 2340 },
		});

		const output = formatTerminal(report);
		expect(output).toContain("test-skill");
		expect(output).toContain("2,340");
	});

	it("displays total row", () => {
		const report = makeReport({
			skills: [
				{
					path: "/a/SKILL.md",
					name: "a",
					totalTokens: 1000,
					sections: [],
				},
				{
					path: "/b/SKILL.md",
					name: "b",
					totalTokens: 2000,
					sections: [],
				},
			],
			totalTokens: 3000,
			cost: { model: "claude-sonnet", costPer1KLoads: 0.009, tokens: 3000 },
		});

		const output = formatTerminal(report);
		expect(output).toContain("Total");
		expect(output).toContain("3,000");
	});

	it("shows redundancy warnings", () => {
		const report = makeReport({
			skills: [{ path: "/a/SKILL.md", name: "a", totalTokens: 100, sections: [] }],
			totalTokens: 100,
			cost: { model: "claude-sonnet", costPer1KLoads: 0, tokens: 100 },
			redundancy: [
				{
					skillA: "/a/SKILL.md",
					skillB: "/b/SKILL.md",
					nameA: "a",
					nameB: "b",
					similarity: 0.4,
					overlapTokens: 40,
					suggestion: "a and b share ~40 tokens of overlapping content",
				},
			],
		});

		const output = formatTerminal(report);
		expect(output).toContain("Redundancy detected");
		expect(output).toContain("overlapping content");
	});

	it("shows section details when detailed is true", () => {
		const report = makeReport({
			skills: [
				{
					path: "/a/SKILL.md",
					name: "a",
					totalTokens: 500,
					sections: [
						{ heading: "(preamble)", tokens: 100, percentage: 20 },
						{ heading: "Setup", tokens: 400, percentage: 80 },
					],
				},
			],
			totalTokens: 500,
			cost: { model: "claude-sonnet", costPer1KLoads: 0.002, tokens: 500 },
		});

		const output = formatTerminal(report, true);
		expect(output).toContain("(preamble)");
		expect(output).toContain("Setup");
	});

	it("shows budget summary", () => {
		const report = makeReport({
			skills: [{ path: "/a/SKILL.md", name: "a", totalTokens: 5000, sections: [] }],
			totalTokens: 5000,
			cost: { model: "claude-sonnet", costPer1KLoads: 0.015, tokens: 5000 },
		});

		const output = formatTerminal(report);
		expect(output).toContain("Budget:");
		expect(output).toContain("128,000");
	});
});

describe("formatComparisonTerminal", () => {
	it("shows empty message when no changes", () => {
		const output = formatComparisonTerminal([]);
		expect(output).toContain("No changes detected");
	});

	it("shows skill diffs", () => {
		const diffs: BudgetDiff[] = [
			{ skill: "a", before: 1000, after: 1500, delta: 500, percentChange: 50 },
		];

		const output = formatComparisonTerminal(diffs);
		expect(output).toContain("Budget Comparison");
		expect(output).toContain("1,000");
		expect(output).toContain("1,500");
	});

	it("includes total line", () => {
		const diffs: BudgetDiff[] = [
			{ skill: "a", before: 1000, after: 1500, delta: 500, percentChange: 50 },
			{ skill: "b", before: 2000, after: 1800, delta: -200, percentChange: -10 },
		];

		const output = formatComparisonTerminal(diffs);
		expect(output).toContain("Total");
	});
});
