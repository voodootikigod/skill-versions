import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BudgetReport } from "../budget/types.js";

// Mock runBudget to avoid filesystem and tokenizer
vi.mock("../budget/index.js", () => ({
	runBudget: vi.fn(),
}));

// Mock comparison module
vi.mock("../budget/comparison.js", () => ({
	saveSnapshot: vi.fn(),
	loadSnapshot: vi.fn(),
	compareSnapshots: vi.fn(),
}));

import { compareSnapshots, loadSnapshot, saveSnapshot } from "../budget/comparison.js";
import { runBudget } from "../budget/index.js";
import { budgetCommand } from "./budget.js";

const mockedRunBudget = vi.mocked(runBudget);
const mockedSaveSnapshot = vi.mocked(saveSnapshot);
const mockedLoadSnapshot = vi.mocked(loadSnapshot);
const mockedCompareSnapshots = vi.mocked(compareSnapshots);

function makeReport(overrides?: Partial<BudgetReport>): BudgetReport {
	return {
		skills: [
			{
				path: "/skills/test/SKILL.md",
				name: "test-skill",
				totalTokens: 2000,
				sections: [{ heading: "Main", tokens: 2000, percentage: 100 }],
			},
		],
		totalTokens: 2000,
		contextWindow: 128_000,
		cost: { model: "claude-sonnet", costPer1KLoads: 0.006, tokens: 2000 },
		redundancy: [],
		generatedAt: "2026-03-03T00:00:00.000Z",
		...overrides,
	};
}

describe("budgetCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedRunBudget.mockResolvedValue(makeReport());
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

	it("returns 0 for a normal report", async () => {
		const code = await budgetCommand(".", {});
		expect(code).toBe(0);
	});

	it("returns 2 for unknown model", async () => {
		const code = await budgetCommand(".", { model: "unknown-model" });
		expect(code).toBe(2);
	});

	it("returns 2 for invalid --max-tokens", async () => {
		const code = await budgetCommand(".", { maxTokens: "banana" });
		expect(code).toBe(2);
	});

	it("returns 1 when max-tokens is exceeded", async () => {
		mockedRunBudget.mockResolvedValue(makeReport({ totalTokens: 5000 }));
		const code = await budgetCommand(".", { maxTokens: "3000" });
		expect(code).toBe(1);
	});

	it("returns 0 when under max-tokens", async () => {
		mockedRunBudget.mockResolvedValue(makeReport({ totalTokens: 2000 }));
		const code = await budgetCommand(".", { maxTokens: "3000" });
		expect(code).toBe(0);
	});

	it("passes skill filter to runBudget", async () => {
		await budgetCommand(".", { skill: "my-skill" });
		expect(mockedRunBudget).toHaveBeenCalledWith(
			["."],
			expect.objectContaining({ skill: "my-skill" })
		);
	});

	it("passes model to runBudget", async () => {
		await budgetCommand(".", { model: "claude-opus" });
		expect(mockedRunBudget).toHaveBeenCalledWith(
			["."],
			expect.objectContaining({ model: "claude-opus" })
		);
	});

	it("outputs json format", async () => {
		const logSpy = vi.mocked(console.log);
		await budgetCommand(".", { format: "json" });
		expect(logSpy).toHaveBeenCalled();
		const output = logSpy.mock.calls[0][0] as string;
		const parsed = JSON.parse(output);
		expect(parsed.totalTokens).toBe(2000);
	});

	it("outputs markdown format", async () => {
		const logSpy = vi.mocked(console.log);
		await budgetCommand(".", { format: "markdown" });
		expect(logSpy).toHaveBeenCalled();
		const output = logSpy.mock.calls[0][0] as string;
		expect(output).toContain("# Context Budget Report");
	});

	it("writes report to file with --output", async () => {
		const outPath = join(tmpdir(), `budget-cmd-test-${Date.now()}.json`);
		await budgetCommand(".", { format: "json", output: outPath });

		const content = await readFile(outPath, "utf-8");
		const parsed = JSON.parse(content);
		expect(parsed.totalTokens).toBe(2000);

		await rm(outPath, { force: true });
	});

	it("saves snapshot when --save is provided", async () => {
		mockedSaveSnapshot.mockResolvedValue(undefined);
		await budgetCommand(".", { save: "/tmp/snapshot.json" });
		expect(mockedSaveSnapshot).toHaveBeenCalledWith(
			expect.objectContaining({ totalTokens: 2000 }),
			"/tmp/snapshot.json"
		);
	});

	it("handles comparison mode", async () => {
		mockedLoadSnapshot.mockResolvedValue({
			skills: [
				{
					path: "/skills/test/SKILL.md",
					name: "test-skill",
					totalTokens: 1500,
					sections: [],
				},
			],
			totalTokens: 1500,
			model: "claude-sonnet",
			generatedAt: "2026-03-01T00:00:00.000Z",
		});
		mockedCompareSnapshots.mockReturnValue([
			{ skill: "test-skill", before: 1500, after: 2000, delta: 500, percentChange: 33.3 },
		]);

		const code = await budgetCommand(".", { compare: "/tmp/baseline.json" });
		expect(code).toBe(0);
		expect(mockedLoadSnapshot).toHaveBeenCalledWith("/tmp/baseline.json");
		expect(mockedCompareSnapshots).toHaveBeenCalled();
	});

	it("returns 2 when snapshot cannot be loaded", async () => {
		mockedLoadSnapshot.mockRejectedValue(new Error("File not found"));
		const code = await budgetCommand(".", { compare: "/tmp/missing.json" });
		expect(code).toBe(2);
	});
});
