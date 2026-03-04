import { readFile } from "node:fs/promises";
import matter from "gray-matter";
import * as semver from "semver";
import { normalizeVersion } from "../severity.js";
import { discoverSkillFiles } from "../shared/discovery.js";
import { readSkillFile } from "../skill-io.js";
import { combineClassification } from "./classifier/combined.js";
import { classifyHeuristic } from "./classifier/heuristics.js";
import { contentSimilarity, onlyUrlsChanged, onlyVersionsChanged } from "./diff/content.js";
import { packageDiff } from "./diff/packages.js";
import { structuralDiff } from "./diff/structural.js";
import { getPreviousVersion } from "./git.js";
import type { VerifyOptions, VerifyReport, VerifyResult, VersionBump } from "./types.js";

/**
 * Determine the bump level between two semver strings.
 * Returns null if either version can't be parsed.
 */
function computeBump(before: string, after: string): VersionBump | null {
	const normBefore = normalizeVersion(before);
	const normAfter = normalizeVersion(after);
	if (!normBefore || !normAfter) return null;

	const bv = normBefore.version;
	const av = normAfter.version;

	if (semver.major(av) > semver.major(bv)) return "major";
	if (semver.minor(av) > semver.minor(bv)) return "minor";
	if (semver.patch(av) > semver.patch(bv)) return "patch";

	// Same version or downgrade — treat as patch
	return "patch";
}

function buildExplanation(result: Omit<VerifyResult, "explanation">): string {
	if (!result.declaredBump) {
		return `Suggested bump: ${result.assessedBump}. No previous version available for comparison.`;
	}
	if (result.match) {
		return `The declared ${result.declaredBump} bump is consistent with the detected changes.`;
	}
	const BUMP_ORDER: Record<VersionBump, number> = { major: 3, minor: 2, patch: 1 };
	if (BUMP_ORDER[result.assessedBump] > BUMP_ORDER[result.declaredBump]) {
		return `The declared ${result.declaredBump} bump appears insufficient. Changes suggest a ${result.assessedBump} bump.`;
	}
	return `The declared ${result.declaredBump} bump appears excessive. Changes suggest only a ${result.assessedBump} bump.`;
}

async function verifyPair(
	beforeContent: string,
	afterContent: string,
	filePath: string,
	options: VerifyOptions,
): Promise<VerifyResult> {
	const afterParsed = matter(afterContent);
	const beforeParsed = matter(beforeContent);

	const skillName =
		(afterParsed.data.name as string) ||
		filePath
			.split("/")
			.filter((s) => s.length > 0)
			.pop() ||
		"unknown";

	const declaredBefore = (beforeParsed.data["product-version"] as string) ?? null;
	const declaredAfter = (afterParsed.data["product-version"] as string) ?? null;

	const declaredBump =
		declaredBefore && declaredAfter
			? computeBump(String(declaredBefore), String(declaredAfter))
			: null;

	// Run diffs
	const structural = structuralDiff(beforeContent, afterContent);
	const packages = packageDiff(beforeContent, afterContent);
	const similarity = contentSimilarity(beforeContent, afterContent);
	const onlyVersions = onlyVersionsChanged(beforeContent, afterContent);
	const onlyUrls = onlyUrlsChanged(beforeContent, afterContent);

	// Run heuristic classification
	const heuristicSignals = classifyHeuristic({
		structural,
		packages,
		similarity,
		onlyVersions,
		onlyUrls,
		beforeContent,
		afterContent,
	});

	// Combine with optional LLM
	const combined = await combineClassification({
		heuristicSignals,
		beforeContent,
		afterContent,
		skipLlm: options.skipLlm,
		providerFlag: options.provider,
		modelFlag: options.model,
	});

	const match = declaredBump ? declaredBump === combined.assessedBump : false;

	const partial: Omit<VerifyResult, "explanation"> = {
		skill: skillName,
		file: filePath,
		declaredBefore: declaredBefore ? String(declaredBefore) : null,
		declaredAfter: declaredAfter ? String(declaredAfter) : null,
		declaredBump,
		assessedBump: combined.assessedBump,
		match: options.suggest ? true : match,
		signals: combined.signals,
		llmUsed: combined.llmUsed,
	};

	return {
		...partial,
		explanation: buildExplanation(partial),
	};
}

/**
 * Run the verify pipeline.
 *
 * Modes:
 * 1. --before / --after: compare two file paths directly
 * 2. --skill or --all: discover skills and compare against git history
 */
export async function runVerify(options: VerifyOptions): Promise<VerifyReport> {
	const results: VerifyResult[] = [];

	if (options.before && options.after) {
		// Mode 1: Explicit path comparison
		const beforeContent = await readFile(options.before, "utf-8");
		const afterContent = await readFile(options.after, "utf-8");
		const result = await verifyPair(beforeContent, afterContent, options.after, options);
		results.push(result);
	} else {
		// Mode 2: Discovery + git history
		const dir = options.skill || ".";
		let files: string[];

		if (options.skill?.endsWith(".md")) {
			files = [options.skill];
		} else {
			files = await discoverSkillFiles(dir);
		}

		for (const filePath of files) {
			const skillFile = await readSkillFile(filePath);
			const previousContent = await getPreviousVersion(filePath);

			if (!previousContent) {
				// New file, no previous version — skip with a note
				results.push({
					skill:
						(skillFile.frontmatter.name as string) ||
						filePath
							.split("/")
							.filter((s) => s.length > 0)
							.pop() ||
						"unknown",
					file: filePath,
					declaredBefore: null,
					declaredAfter: (skillFile.frontmatter["product-version"] as string) ?? null,
					declaredBump: null,
					assessedBump: "patch",
					match: false,
					signals: [],
					explanation: "New file with no previous version in git history. Cannot verify bump.",
					llmUsed: false,
				});
				continue;
			}

			const result = await verifyPair(previousContent, skillFile.raw, filePath, options);
			results.push(result);
		}
	}

	const passed = results.filter((r) => r.match).length;
	const failed = results.filter((r) => !r.match && r.declaredBump !== null).length;
	const skipped = results.filter((r) => !r.match && r.declaredBump === null).length;

	return {
		results,
		summary: { passed, failed, skipped },
		generatedAt: new Date().toISOString(),
	};
}
