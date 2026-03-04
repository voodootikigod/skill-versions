import { stat } from "node:fs/promises";
import { discoverSkillFiles } from "../shared/discovery.js";
import { parseSections } from "../shared/sections.js";
import { readSkillFile } from "../skill-io.js";
import { analyzeSkill } from "./analyzer.js";
import { estimateCost } from "./cost.js";
import { detectRedundancy } from "./redundancy.js";
import type { BudgetOptions, BudgetReport, SkillBudget } from "./types.js";

/** Default context window size (128K tokens). */
const DEFAULT_CONTEXT_WINDOW = 128_000;

/**
 * Run the budget analysis pipeline.
 *
 * 1. Discover skill files
 * 2. Read and parse each skill
 * 3. Analyze token counts per skill and section
 * 4. Detect redundancy across skills
 * 5. Compute cost estimates
 * 6. Return a BudgetReport
 */
export async function runBudget(
	paths: string[],
	options: BudgetOptions = {}
): Promise<BudgetReport> {
	// 1. Discover all skill files
	const allFiles: string[] = [];
	for (const p of paths) {
		try {
			const info = await stat(p);
			if (info.isDirectory()) {
				const discovered = await discoverSkillFiles(p);
				allFiles.push(...discovered);
			} else if (p.endsWith(".md")) {
				allFiles.push(p);
			}
		} catch {
			throw new Error(`Cannot access path: ${p}`);
		}
	}

	const emptyReport: BudgetReport = {
		skills: [],
		totalTokens: 0,
		contextWindow: DEFAULT_CONTEXT_WINDOW,
		cost: estimateCost(0, options.model),
		redundancy: [],
		generatedAt: new Date().toISOString(),
	};

	if (allFiles.length === 0) {
		return emptyReport;
	}

	// 2-3. Read, parse sections, and analyze each skill
	const skillBudgets: SkillBudget[] = [];
	const contentMap = new Map<string, string>();

	for (const filePath of allFiles) {
		const skillFile = await readSkillFile(filePath);
		const sections = parseSections(skillFile.raw);
		const budget = analyzeSkill(skillFile, sections);

		// Filter by --skill if specified
		if (options.skill && budget.name !== options.skill) {
			continue;
		}

		skillBudgets.push(budget);
		contentMap.set(filePath, skillFile.raw);
	}

	// 4. Detect redundancy
	const redundancy = detectRedundancy(skillBudgets, contentMap);

	// 5. Compute totals and cost
	const totalTokens = skillBudgets.reduce((sum, s) => sum + s.totalTokens, 0);
	const cost = estimateCost(totalTokens, options.model);

	// 6. Return report
	return {
		skills: skillBudgets,
		totalTokens,
		contextWindow: DEFAULT_CONTEXT_WINDOW,
		cost,
		redundancy,
		generatedAt: new Date().toISOString(),
	};
}
