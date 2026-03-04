import { stat } from "node:fs/promises";
import { discoverSkillFiles } from "../shared/discovery.js";
import { readSkillFile, writeSkillFile } from "../skill-io.js";
import { autofix } from "./autofix.js";
import { checkConditional } from "./rules/conditional.js";
import { checkFormats } from "./rules/format.js";
import { checkPublishReady } from "./rules/publish.js";
import { checkRecommended } from "./rules/recommended.js";
import { checkRequired } from "./rules/required.js";
import type { LintFinding, LintOptions, LintReport } from "./types.js";

/**
 * Run the lint pipeline on skill files.
 *
 * 1. Discover SKILL.md files in the given paths
 * 2. Parse frontmatter and content
 * 3. Run all rule sets: required, publish, conditional, recommended, format
 * 4. If --fix is set, apply auto-fixes and write back
 * 5. Return a LintReport with findings and summary counts
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
export async function runLint(paths: string[], options: LintOptions = {}): Promise<LintReport> {
	// Discover all skill files
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

	const emptyReport: LintReport = {
		files: 0,
		findings: [],
		errors: 0,
		warnings: 0,
		infos: 0,
		fixed: 0,
		generatedAt: new Date().toISOString(),
	};

	if (allFiles.length === 0) {
		return emptyReport;
	}

	const allFindings: LintFinding[] = [];
	let totalFixed = 0;

	for (const filePath of allFiles) {
		const skillFile = await readSkillFile(filePath);

		// Run all rule sets
		const findings: LintFinding[] = [
			...checkRequired(skillFile),
			...checkPublishReady(skillFile),
			...checkConditional(skillFile),
			...checkRecommended(skillFile),
			...checkFormats(skillFile),
		];

		// Deduplicate findings on the same field with the same level
		// (e.g., publish.ts and format.ts both checking repository URL validity)
		const seen = new Set<string>();
		const deduped: LintFinding[] = [];
		for (const f of findings) {
			const key = `${f.file}:${f.field}:${f.level}:${f.message}`;
			if (!seen.has(key)) {
				seen.add(key);
				deduped.push(f);
			}
		}

		// Apply auto-fix if requested
		if (options.fix) {
			const result = await autofix(skillFile, deduped);
			if (result) {
				await writeSkillFile(filePath, result.content);
				totalFixed += result.fixed.length;
				// Remove fixed findings from the results
				const fixedSet = new Set(result.fixed);
				for (const f of deduped) {
					if (!(f.fixable && fixedSet.has(f.field))) {
						allFindings.push(f);
					}
				}
				continue;
			}
		}

		allFindings.push(...deduped);
	}

	return {
		files: allFiles.length,
		findings: allFindings,
		errors: allFindings.filter((f) => f.level === "error").length,
		warnings: allFindings.filter((f) => f.level === "warning").length,
		infos: allFindings.filter((f) => f.level === "info").length,
		fixed: totalFixed,
		generatedAt: new Date().toISOString(),
	};
}
