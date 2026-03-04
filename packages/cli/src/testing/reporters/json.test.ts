import { describe, expect, it } from "vitest";
import type { TestReport } from "../types.js";
import { formatJson } from "./json.js";

describe("formatJson", () => {
	it("returns valid JSON", () => {
		const reports: TestReport[] = [
			{
				skillName: "test",
				skillPath: "/path/SKILL.md",
				suite: "test-suite",
				cases: [],
				passed: 0,
				failed: 0,
				skipped: 0,
				totalDuration: 100,
				generatedAt: "2026-03-03T00:00:00.000Z",
			},
		];

		const output = formatJson(reports);
		const parsed = JSON.parse(output);
		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed[0].skillName).toBe("test");
	});

	it("includes case results", () => {
		const reports: TestReport[] = [
			{
				skillName: "test",
				skillPath: "/path/SKILL.md",
				suite: "test-suite",
				cases: [
					{
						caseId: "case-1",
						type: "outcome",
						prompt: "test prompt",
						trials: [],
						passed: true,
						passRate: 1.0,
						flaky: false,
					},
				],
				passed: 1,
				failed: 0,
				skipped: 0,
				totalDuration: 100,
				generatedAt: "2026-03-03T00:00:00.000Z",
			},
		];

		const output = formatJson(reports);
		const parsed = JSON.parse(output);
		expect(parsed[0].cases[0].caseId).toBe("case-1");
	});

	it("returns empty array for no reports", () => {
		const output = formatJson([]);
		expect(JSON.parse(output)).toEqual([]);
	});
});
