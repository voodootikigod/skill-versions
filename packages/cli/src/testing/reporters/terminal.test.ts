import { describe, expect, it } from "vitest";
import type { TestReport } from "../types.js";
import { formatTerminal } from "./terminal.js";

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

describe("formatTerminal", () => {
	it("shows empty message when no reports", () => {
		const output = formatTerminal([]);
		expect(output).toContain("No testable skills found");
	});

	it("shows suite name and skill path", () => {
		const output = formatTerminal([makeReport()]);
		expect(output).toContain("test-suite");
		expect(output).toContain("test-skill");
	});

	it("shows pass/fail for each case", () => {
		const output = formatTerminal([
			makeReport({
				cases: [
					{
						caseId: "pass-case",
						type: "outcome",
						prompt: "test",
						trials: [],
						passed: true,
						passRate: 1.0,
						flaky: false,
					},
					{
						caseId: "fail-case",
						type: "outcome",
						prompt: "test",
						trials: [],
						passed: false,
						passRate: 0,
						flaky: false,
					},
				],
				passed: 1,
				failed: 1,
			}),
		]);

		expect(output).toContain("PASS");
		expect(output).toContain("FAIL");
		expect(output).toContain("pass-case");
		expect(output).toContain("fail-case");
	});

	it("shows flaky indicator", () => {
		const output = formatTerminal([
			makeReport({
				cases: [
					{
						caseId: "flaky-case",
						type: "outcome",
						prompt: "test",
						trials: [],
						passed: true,
						passRate: 0.67,
						flaky: true,
					},
				],
				passed: 1,
			}),
		]);

		expect(output).toContain("FLAKY");
	});

	it("shows summary", () => {
		const output = formatTerminal([
			makeReport({
				passed: 3,
				failed: 1,
				cases: [
					{
						caseId: "c1",
						type: "outcome",
						prompt: "t",
						trials: [],
						passed: true,
						passRate: 1,
						flaky: false,
					},
					{
						caseId: "c2",
						type: "outcome",
						prompt: "t",
						trials: [],
						passed: true,
						passRate: 1,
						flaky: false,
					},
					{
						caseId: "c3",
						type: "outcome",
						prompt: "t",
						trials: [],
						passed: true,
						passRate: 1,
						flaky: false,
					},
					{
						caseId: "c4",
						type: "outcome",
						prompt: "t",
						trials: [],
						passed: false,
						passRate: 0,
						flaky: false,
					},
				],
			}),
		]);

		expect(output).toContain("Passed:");
		expect(output).toContain("3");
		expect(output).toContain("Failed:");
	});
});
