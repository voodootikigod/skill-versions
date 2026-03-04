import { describe, expect, it } from "vitest";
import type { BudgetDiff, BudgetReport } from "../types.js";
import { formatComparisonMarkdown, formatMarkdown } from "./markdown.js";

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

describe("formatMarkdown", () => {
	it("includes title", () => {
		const output = formatMarkdown(makeReport());
		expect(output).toContain("# Context Budget Report");
	});

	it("includes generated date", () => {
		const output = formatMarkdown(makeReport());
		expect(output).toContain("2026-03-03");
	});

	it("shows empty message when no skills", () => {
		const output = formatMarkdown(makeReport());
		expect(output).toContain("No skill files found");
	});

	it("renders skill table", () => {
		const report = makeReport({
			skills: [
				{
					path: "/a/SKILL.md",
					name: "test-skill",
					totalTokens: 2340,
					sections: [{ heading: "Main", tokens: 2340, percentage: 100 }],
				},
			],
			totalTokens: 2340,
			cost: { model: "claude-sonnet", costPer1KLoads: 0.007, tokens: 2340 },
		});

		const output = formatMarkdown(report);
		expect(output).toContain("| test-skill |");
		expect(output).toContain("2,340");
		expect(output).toContain("**Total**");
	});

	it("shows section detail rows when detailed is true", () => {
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

		const output = formatMarkdown(report, true);
		expect(output).toContain("(preamble)");
		expect(output).toContain("Setup");
	});

	it("shows redundancy section when matches exist", () => {
		const report = makeReport({
			skills: [{ path: "/a/SKILL.md", name: "a", totalTokens: 100, sections: [] }],
			totalTokens: 100,
			cost: { model: "claude-sonnet", costPer1KLoads: 0, tokens: 100 },
			redundancy: [
				{
					skillA: "/a",
					skillB: "/b",
					nameA: "a",
					nameB: "b",
					similarity: 0.3,
					overlapTokens: 30,
					suggestion: "a and b share overlapping content",
				},
			],
		});

		const output = formatMarkdown(report);
		expect(output).toContain("## Redundancy");
		expect(output).toContain("overlapping content");
	});

	it("shows model name", () => {
		const report = makeReport({
			skills: [{ path: "/a/SKILL.md", name: "a", totalTokens: 100, sections: [] }],
			totalTokens: 100,
			cost: { model: "claude-opus", costPer1KLoads: 0.002, tokens: 100 },
		});

		const output = formatMarkdown(report);
		expect(output).toContain("claude-opus");
	});

	it("includes summary with budget line", () => {
		const report = makeReport({
			skills: [{ path: "/a/SKILL.md", name: "a", totalTokens: 5000, sections: [] }],
			totalTokens: 5000,
			cost: { model: "claude-sonnet", costPer1KLoads: 0.015, tokens: 5000 },
		});

		const output = formatMarkdown(report);
		expect(output).toContain("## Summary");
		expect(output).toContain("128,000");
	});
});

describe("formatComparisonMarkdown", () => {
	it("includes title", () => {
		const output = formatComparisonMarkdown([]);
		expect(output).toContain("# Budget Comparison");
	});

	it("shows empty message when no diffs", () => {
		const output = formatComparisonMarkdown([]);
		expect(output).toContain("No changes detected");
	});

	it("renders diff table", () => {
		const diffs: BudgetDiff[] = [
			{ skill: "a", before: 1000, after: 1500, delta: 500, percentChange: 50 },
		];

		const output = formatComparisonMarkdown(diffs);
		expect(output).toContain("| a |");
		expect(output).toContain("1,000");
		expect(output).toContain("1,500");
		expect(output).toContain("+500");
	});

	it("includes total row", () => {
		const diffs: BudgetDiff[] = [
			{ skill: "a", before: 1000, after: 1500, delta: 500, percentChange: 50 },
		];

		const output = formatComparisonMarkdown(diffs);
		expect(output).toContain("**Total**");
	});
});
