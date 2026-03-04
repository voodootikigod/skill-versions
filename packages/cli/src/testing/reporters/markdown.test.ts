import { describe, expect, it } from "vitest";
import type { TestReport } from "../types.js";
import { formatMarkdown } from "./markdown.js";

function makeReport(overrides?: Partial<TestReport>): TestReport {
	return {
		skillName: "test-skill",
		skillPath: "/path/to/test-skill/SKILL.md",
		suite: "test-suite",
		cases: [],
		passed: 0,
		failed: 0,
		skipped: 0,
		totalDuration: 100,
		generatedAt: "2026-03-03T00:00:00.000Z",
		...overrides,
	};
}

describe("formatMarkdown", () => {
	it("shows title", () => {
		const output = formatMarkdown([]);
		expect(output).toContain("# Skillsafe Test Report");
	});

	it("shows empty message when no reports", () => {
		const output = formatMarkdown([]);
		expect(output).toContain("No testable skills found");
	});

	it("shows summary table", () => {
		const output = formatMarkdown([
			makeReport({
				passed: 3,
				failed: 1,
				skipped: 0,
			}),
		]);

		expect(output).toContain("| Passed | 3 |");
		expect(output).toContain("| Failed | 1 |");
	});

	it("shows case results table", () => {
		const output = formatMarkdown([
			makeReport({
				cases: [
					{
						caseId: "test-case",
						type: "outcome",
						prompt: "test",
						trials: [],
						passed: true,
						passRate: 1.0,
						flaky: false,
					},
				],
				passed: 1,
			}),
		]);

		expect(output).toContain("test-case");
		expect(output).toContain("PASS");
		expect(output).toContain("100%");
	});

	it("shows baseline regressions", () => {
		const diffs = new Map([
			[
				"/path/to/test-skill/SKILL.md",
				{
					regressions: [{ caseId: "reg-case", wasPassRate: 1.0, nowPassRate: 0.33 }],
					improvements: [],
					unchanged: 0,
					newCases: [],
					removedCases: [],
				},
			],
		]);

		const output = formatMarkdown([makeReport()], diffs);
		expect(output).toContain("Regressions");
		expect(output).toContain("reg-case");
	});
});
