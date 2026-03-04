import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compareSnapshots, loadSnapshot, saveSnapshot } from "./comparison.js";
import type { BudgetReport, BudgetSnapshot } from "./types.js";

function makeReport(overrides?: Partial<BudgetReport>): BudgetReport {
	return {
		skills: [
			{
				path: "/skills/a/SKILL.md",
				name: "skill-a",
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

function makeSnapshot(overrides?: Partial<BudgetSnapshot>): BudgetSnapshot {
	return {
		skills: [
			{
				path: "/skills/a/SKILL.md",
				name: "skill-a",
				totalTokens: 1000,
				sections: [{ heading: "Main", tokens: 1000, percentage: 100 }],
			},
		],
		totalTokens: 1000,
		model: "claude-sonnet",
		generatedAt: "2026-03-03T00:00:00.000Z",
		...overrides,
	};
}

describe("saveSnapshot and loadSnapshot", () => {
	const tmpFiles: string[] = [];

	afterEach(async () => {
		for (const f of tmpFiles) {
			await rm(f, { force: true });
		}
		tmpFiles.length = 0;
	});

	it("round-trips a snapshot through save and load", async () => {
		const path = join(tmpdir(), `budget-test-${Date.now()}.json`);
		tmpFiles.push(path);

		const report = makeReport();
		await saveSnapshot(report, path);

		const loaded = await loadSnapshot(path);
		expect(loaded.skills).toEqual(report.skills);
		expect(loaded.totalTokens).toBe(report.totalTokens);
		expect(loaded.model).toBe("claude-sonnet");
		expect(loaded.generatedAt).toBe(report.generatedAt);
	});

	it("saves valid JSON", async () => {
		const path = join(tmpdir(), `budget-test-${Date.now()}.json`);
		tmpFiles.push(path);

		await saveSnapshot(makeReport(), path);
		const raw = await readFile(path, "utf-8");
		expect(() => JSON.parse(raw)).not.toThrow();
	});
});

describe("compareSnapshots", () => {
	it("detects no changes for identical snapshots", () => {
		const snapshot = makeSnapshot();
		const diffs = compareSnapshots(snapshot, snapshot);

		expect(diffs).toHaveLength(1);
		expect(diffs[0].delta).toBe(0);
		expect(diffs[0].percentChange).toBe(0);
	});

	it("detects token increase", () => {
		const before = makeSnapshot();
		const after = makeSnapshot({
			skills: [
				{
					path: "/skills/a/SKILL.md",
					name: "skill-a",
					totalTokens: 1500,
					sections: [{ heading: "Main", tokens: 1500, percentage: 100 }],
				},
			],
			totalTokens: 1500,
		});

		const diffs = compareSnapshots(before, after);
		expect(diffs[0].delta).toBe(500);
		expect(diffs[0].percentChange).toBe(50);
	});

	it("detects token decrease", () => {
		const before = makeSnapshot();
		const after = makeSnapshot({
			skills: [
				{
					path: "/skills/a/SKILL.md",
					name: "skill-a",
					totalTokens: 800,
					sections: [{ heading: "Main", tokens: 800, percentage: 100 }],
				},
			],
			totalTokens: 800,
		});

		const diffs = compareSnapshots(before, after);
		expect(diffs[0].delta).toBe(-200);
		expect(diffs[0].percentChange).toBe(-20);
	});

	it("handles new skills added", () => {
		const before = makeSnapshot();
		const after = makeSnapshot({
			skills: [
				...before.skills,
				{
					path: "/skills/b/SKILL.md",
					name: "skill-b",
					totalTokens: 500,
					sections: [{ heading: "Main", tokens: 500, percentage: 100 }],
				},
			],
			totalTokens: 1500,
		});

		const diffs = compareSnapshots(before, after);
		expect(diffs).toHaveLength(2);
		const newSkill = diffs.find((d) => d.skill === "skill-b");
		expect(newSkill).toBeDefined();
		expect(newSkill?.before).toBe(0);
		expect(newSkill?.after).toBe(500);
		expect(newSkill?.percentChange).toBe(100);
	});

	it("handles removed skills", () => {
		const before = makeSnapshot({
			skills: [
				{
					path: "/skills/a/SKILL.md",
					name: "skill-a",
					totalTokens: 1000,
					sections: [{ heading: "Main", tokens: 1000, percentage: 100 }],
				},
				{
					path: "/skills/b/SKILL.md",
					name: "skill-b",
					totalTokens: 500,
					sections: [{ heading: "Main", tokens: 500, percentage: 100 }],
				},
			],
			totalTokens: 1500,
		});
		const after = makeSnapshot();

		const diffs = compareSnapshots(before, after);
		expect(diffs).toHaveLength(2);
		const removed = diffs.find((d) => d.skill === "skill-b");
		expect(removed).toBeDefined();
		expect(removed?.after).toBe(0);
	});

	it("sorts by absolute delta descending", () => {
		const before = makeSnapshot({
			skills: [
				{
					path: "/a",
					name: "a",
					totalTokens: 1000,
					sections: [],
				},
				{
					path: "/b",
					name: "b",
					totalTokens: 1000,
					sections: [],
				},
			],
		});
		const after = makeSnapshot({
			skills: [
				{
					path: "/a",
					name: "a",
					totalTokens: 1100,
					sections: [],
				},
				{
					path: "/b",
					name: "b",
					totalTokens: 1500,
					sections: [],
				},
			],
		});

		const diffs = compareSnapshots(before, after);
		expect(Math.abs(diffs[0].delta)).toBeGreaterThanOrEqual(Math.abs(diffs[1].delta));
	});
});
