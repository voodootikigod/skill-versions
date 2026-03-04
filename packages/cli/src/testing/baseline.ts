import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import type { BaselineDiff, TestReport } from "./types.js";

const BASELINE_DIR = ".skillsafe/test-baselines";

function getBaselinePath(skillPath: string): string {
	const skillDir = dirname(skillPath);
	const skillName = basename(skillDir);
	// Find root by walking up until we find .skillsafe or use cwd
	return join(BASELINE_DIR, `${skillName}.json`);
}

/**
 * Load a test baseline for a skill.
 * Returns null if no baseline exists.
 */
export async function loadBaseline(skillPath: string): Promise<TestReport | null> {
	const baselinePath = getBaselinePath(skillPath);
	try {
		const content = await readFile(baselinePath, "utf-8");
		return JSON.parse(content) as TestReport;
	} catch {
		return null;
	}
}

/**
 * Save current test results as the baseline for a skill.
 */
export async function saveBaseline(skillPath: string, report: TestReport): Promise<void> {
	const baselinePath = getBaselinePath(skillPath);
	await mkdir(dirname(baselinePath), { recursive: true });
	await writeFile(baselinePath, JSON.stringify(report, null, 2), "utf-8");
}

/**
 * Compare current results against a baseline.
 * Detects regressions (was passing, now failing) and improvements (was failing, now passing).
 */
export function compareBaseline(current: TestReport, baseline: TestReport): BaselineDiff {
	const regressions: BaselineDiff["regressions"] = [];
	const improvements: BaselineDiff["improvements"] = [];
	let unchanged = 0;
	const newCases: string[] = [];
	const removedCases: string[] = [];

	const baselineMap = new Map(baseline.cases.map((c) => [c.caseId, c]));
	const currentMap = new Map(current.cases.map((c) => [c.caseId, c]));

	// Check current cases against baseline
	for (const currentCase of current.cases) {
		const baselineCase = baselineMap.get(currentCase.caseId);

		if (!baselineCase) {
			newCases.push(currentCase.caseId);
			continue;
		}

		if (baselineCase.passed && !currentCase.passed) {
			regressions.push({
				caseId: currentCase.caseId,
				wasPassRate: baselineCase.passRate,
				nowPassRate: currentCase.passRate,
			});
		} else if (!baselineCase.passed && currentCase.passed) {
			improvements.push({
				caseId: currentCase.caseId,
				wasPassRate: baselineCase.passRate,
				nowPassRate: currentCase.passRate,
			});
		} else {
			unchanged++;
		}
	}

	// Check for removed cases
	for (const baselineCase of baseline.cases) {
		if (!currentMap.has(baselineCase.caseId)) {
			removedCases.push(baselineCase.caseId);
		}
	}

	return { regressions, improvements, unchanged, newCases, removedCases };
}
