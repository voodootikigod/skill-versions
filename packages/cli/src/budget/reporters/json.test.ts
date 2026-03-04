import { describe, expect, it } from "vitest";
import type { BudgetDiff, BudgetReport } from "../types.js";
import { formatComparisonJson, formatJson } from "./json.js";

function makeReport(overrides?: Partial<BudgetReport>): BudgetReport {
	return {
		skills: [
			{
				path: "/skills/test/SKILL.md",
				name: "test-skill",
				totalTokens: 1000,
				sections: [{ heading: "Main", tokens: 1000, percentage: 100 }],
			},
		],
		totalTokens: 1000,
		contextWindow: 128_000,
		cost: { model: "claude-sonnet", costPer1KLoads: 0.003, tokens: 1000 },
		redundancy: [],
		generatedAt: "2026-03-03T00:00:00.000Z",
		...overrides,
	};
}

describe("formatJson", () => {
	it("produces valid JSON", () => {
		const output = formatJson(makeReport());
		expect(() => JSON.parse(output)).not.toThrow();
	});

	it("includes all report fields", () => {
		const output = formatJson(makeReport());
		const parsed = JSON.parse(output);
		expect(parsed.skills).toBeDefined();
		expect(parsed.totalTokens).toBe(1000);
		expect(parsed.contextWindow).toBe(128_000);
		expect(parsed.cost).toBeDefined();
		expect(parsed.redundancy).toEqual([]);
		expect(parsed.generatedAt).toBeDefined();
	});

	it("is pretty-printed with 2-space indent", () => {
		const output = formatJson(makeReport());
		expect(output).toContain("\n  ");
	});
});

describe("formatComparisonJson", () => {
	it("produces valid JSON", () => {
		const diffs: BudgetDiff[] = [
			{ skill: "a", before: 1000, after: 1500, delta: 500, percentChange: 50 },
		];
		const output = formatComparisonJson(diffs);
		expect(() => JSON.parse(output)).not.toThrow();
	});

	it("contains diff entries", () => {
		const diffs: BudgetDiff[] = [
			{ skill: "a", before: 1000, after: 1500, delta: 500, percentChange: 50 },
		];
		const output = formatComparisonJson(diffs);
		const parsed = JSON.parse(output);
		expect(parsed).toHaveLength(1);
		expect(parsed[0].skill).toBe("a");
		expect(parsed[0].delta).toBe(500);
	});
});
