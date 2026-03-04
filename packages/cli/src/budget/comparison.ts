import { readFile, writeFile } from "node:fs/promises";
import type { BudgetDiff, BudgetReport, BudgetSnapshot } from "./types.js";

/**
 * Save a budget report as a snapshot for later comparison.
 */
export async function saveSnapshot(report: BudgetReport, path: string): Promise<void> {
	const snapshot: BudgetSnapshot = {
		skills: report.skills,
		totalTokens: report.totalTokens,
		model: report.cost.model,
		generatedAt: report.generatedAt,
	};

	await writeFile(path, JSON.stringify(snapshot, null, 2), "utf-8");
}

/**
 * Load a previously saved budget snapshot from disk.
 */
export async function loadSnapshot(path: string): Promise<BudgetSnapshot> {
	const raw = await readFile(path, "utf-8");
	return JSON.parse(raw) as BudgetSnapshot;
}

/**
 * Compare two snapshots and produce diffs for each skill.
 *
 * Skills present in only one snapshot appear with 0 for the missing side.
 */
export function compareSnapshots(before: BudgetSnapshot, after: BudgetSnapshot): BudgetDiff[] {
	const beforeMap = new Map<string, number>();
	for (const skill of before.skills) {
		beforeMap.set(skill.name, skill.totalTokens);
	}

	const afterMap = new Map<string, number>();
	for (const skill of after.skills) {
		afterMap.set(skill.name, skill.totalTokens);
	}

	// Collect all unique skill names
	const allNames = new Set([...beforeMap.keys(), ...afterMap.keys()]);
	const diffs: BudgetDiff[] = [];

	for (const name of allNames) {
		const beforeTokens = beforeMap.get(name) ?? 0;
		const afterTokens = afterMap.get(name) ?? 0;
		const delta = afterTokens - beforeTokens;
		let percentChange: number;
		if (beforeTokens > 0) {
			percentChange = (delta / beforeTokens) * 100;
		} else if (afterTokens > 0) {
			percentChange = 100;
		} else {
			percentChange = 0;
		}

		diffs.push({
			skill: name,
			before: beforeTokens,
			after: afterTokens,
			delta,
			percentChange: Math.round(percentChange * 10) / 10,
		});
	}

	// Sort by absolute delta descending (biggest changes first)
	diffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

	return diffs;
}
