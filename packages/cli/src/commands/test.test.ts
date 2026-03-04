import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BaselineDiff, TestReport } from "../testing/types.js";

// Mock runTests to avoid filesystem/network calls
vi.mock("../testing/index.js", () => ({
	runTests: vi.fn(),
}));

import { runTests } from "../testing/index.js";
import { testCommand } from "./test.js";

const mockedRunTests = vi.mocked(runTests);

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

describe("testCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedRunTests.mockResolvedValue({
			reports: [makeReport({ passed: 1 })],
			baselineDiffs: new Map(),
		});
		vi.spyOn(console, "log").mockImplementation(() => {
			/* intentionally empty */
		});
		vi.spyOn(console, "error").mockImplementation(() => {
			/* intentionally empty */
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns 0 when all tests pass", async () => {
		const code = await testCommand(".", {});
		expect(code).toBe(0);
	});

	it("returns 1 when tests fail", async () => {
		mockedRunTests.mockResolvedValue({
			reports: [makeReport({ failed: 2 })],
			baselineDiffs: new Map(),
		});

		const code = await testCommand(".", {});
		expect(code).toBe(1);
	});

	it("returns 0 for dry run", async () => {
		mockedRunTests.mockResolvedValue({
			reports: [
				makeReport({
					skipped: 3,
					cases: [
						{
							caseId: "c1",
							type: "outcome",
							prompt: "test",
							trials: [],
							passed: false,
							passRate: 0,
							flaky: false,
						},
					],
				}),
			],
			baselineDiffs: new Map(),
			costEstimate: { totalEstimatedCost: 0.01, perSuite: [] },
		});

		const code = await testCommand(".", { dry: true });
		expect(code).toBe(0);
	});

	it("returns 1 in CI mode with regressions", async () => {
		const diffs = new Map<string, BaselineDiff>([
			[
				"/path/SKILL.md",
				{
					regressions: [{ caseId: "reg", wasPassRate: 1.0, nowPassRate: 0 }],
					improvements: [],
					unchanged: 0,
					newCases: [],
					removedCases: [],
				},
			],
		]);

		mockedRunTests.mockResolvedValue({
			reports: [makeReport({ passed: 1 })],
			baselineDiffs: diffs,
		});

		const code = await testCommand(".", { ci: true });
		expect(code).toBe(1);
	});

	it("passes options through to runTests", async () => {
		await testCommand(".", {
			skill: "my-skill",
			type: "trigger",
			agent: "claude-code",
			trials: "5",
		});

		expect(mockedRunTests).toHaveBeenCalledWith(
			".",
			expect.objectContaining({
				skill: "my-skill",
				type: "trigger",
				agent: "claude-code",
				trials: 5,
			})
		);
	});

	it("outputs json format", async () => {
		const logSpy = vi.mocked(console.log);
		await testCommand(".", { format: "json" });

		expect(logSpy).toHaveBeenCalled();
		const output = logSpy.mock.calls[0][0] as string;
		const parsed = JSON.parse(output);
		expect(Array.isArray(parsed)).toBe(true);
	});

	it("outputs markdown format", async () => {
		const logSpy = vi.mocked(console.log);
		await testCommand(".", { format: "markdown" });

		expect(logSpy).toHaveBeenCalled();
		const output = logSpy.mock.calls[0][0] as string;
		expect(output).toContain("# Skillsafe Test Report");
	});

	it("shows verbose output", async () => {
		const errorSpy = vi.mocked(console.error);
		await testCommand(".", { verbose: true });

		const allOutput = errorSpy.mock.calls.map((c) => c[0]).join("\n");
		expect(allOutput).toContain("Testing");
	});
});
