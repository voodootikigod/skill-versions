import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { compareBaseline, loadBaseline, saveBaseline } from "./baseline.js";
import type { TestReport } from "./types.js";

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

describe("compareBaseline", () => {
	it("detects regressions", () => {
		const baseline = makeReport({
			cases: [
				{
					caseId: "test-1",
					type: "outcome",
					prompt: "test",
					trials: [],
					passed: true,
					passRate: 1.0,
					flaky: false,
				},
			],
		});

		const current = makeReport({
			cases: [
				{
					caseId: "test-1",
					type: "outcome",
					prompt: "test",
					trials: [],
					passed: false,
					passRate: 0.33,
					flaky: true,
				},
			],
		});

		const diff = compareBaseline(current, baseline);
		expect(diff.regressions).toHaveLength(1);
		expect(diff.regressions[0].caseId).toBe("test-1");
		expect(diff.improvements).toHaveLength(0);
	});

	it("detects improvements", () => {
		const baseline = makeReport({
			cases: [
				{
					caseId: "test-1",
					type: "outcome",
					prompt: "test",
					trials: [],
					passed: false,
					passRate: 0.33,
					flaky: true,
				},
			],
		});

		const current = makeReport({
			cases: [
				{
					caseId: "test-1",
					type: "outcome",
					prompt: "test",
					trials: [],
					passed: true,
					passRate: 1.0,
					flaky: false,
				},
			],
		});

		const diff = compareBaseline(current, baseline);
		expect(diff.improvements).toHaveLength(1);
		expect(diff.regressions).toHaveLength(0);
	});

	it("detects new cases", () => {
		const baseline = makeReport({ cases: [] });
		const current = makeReport({
			cases: [
				{
					caseId: "new-case",
					type: "outcome",
					prompt: "test",
					trials: [],
					passed: true,
					passRate: 1.0,
					flaky: false,
				},
			],
		});

		const diff = compareBaseline(current, baseline);
		expect(diff.newCases).toEqual(["new-case"]);
	});

	it("detects removed cases", () => {
		const baseline = makeReport({
			cases: [
				{
					caseId: "old-case",
					type: "outcome",
					prompt: "test",
					trials: [],
					passed: true,
					passRate: 1.0,
					flaky: false,
				},
			],
		});
		const current = makeReport({ cases: [] });

		const diff = compareBaseline(current, baseline);
		expect(diff.removedCases).toEqual(["old-case"]);
	});

	it("counts unchanged cases", () => {
		const caseData = {
			caseId: "stable",
			type: "outcome" as const,
			prompt: "test",
			trials: [],
			passed: true,
			passRate: 1.0,
			flaky: false,
		};

		const baseline = makeReport({ cases: [caseData] });
		const current = makeReport({ cases: [caseData] });

		const diff = compareBaseline(current, baseline);
		expect(diff.unchanged).toBe(1);
	});
});

describe("loadBaseline", () => {
	it("returns null when no baseline exists", async () => {
		const result = await loadBaseline("/nonexistent/path/SKILL.md");
		expect(result).toBeNull();
	});
});

describe("saveBaseline and loadBaseline", () => {
	let baselineDir: string;
	const originalCwd = process.cwd();

	beforeEach(async () => {
		baselineDir = join(tmpdir(), `skills-check-baseline-${Date.now()}`);
		await mkdir(baselineDir, { recursive: true });
		process.chdir(baselineDir);
	});

	afterEach(async () => {
		process.chdir(originalCwd);
		await rm(baselineDir, { recursive: true, force: true });
	});

	it("saves and loads a baseline", async () => {
		const report = makeReport({ passed: 5, failed: 1 });
		const skillPath = join(baselineDir, "test-skill", "SKILL.md");

		await saveBaseline(skillPath, report);
		const loaded = await loadBaseline(skillPath);

		expect(loaded).not.toBeNull();
		expect(loaded?.passed).toBe(5);
		expect(loaded?.failed).toBe(1);
	});
});
