import type { PackageDiff } from "../diff/packages.js";
import type { StructuralDiff } from "../diff/structural.js";
import type { ChangeSignal, VersionBump } from "../types.js";

interface HeuristicInput {
	afterContent: string;
	beforeContent: string;
	onlyUrls: boolean;
	onlyVersions: boolean;
	packages: PackageDiff;
	similarity: number;
	structural: StructuralDiff;
}

// Text patterns that indicate breaking/major changes
const MAJOR_PATTERNS = [
	/\bdeprecated\b/i,
	/\bremoved\b/i,
	/\bno longer\b/i,
	/\bbreaking change\b/i,
	/\bbreaking\b/i,
	/\breplaced by\b/i,
	/\bmigrat(?:e|ion|ing)\b/i,
];

// Text patterns that indicate minor/additive changes
const MINOR_PATTERNS = [
	/\bnew section\b/i,
	/\badded support\b/i,
	/\bnew feature\b/i,
	/\bnow supports?\b/i,
	/\bintroduc(?:e[ds]?|ing)\b/i,
];

function findAddedText(before: string, after: string): string {
	const beforeLines = new Set(before.split("\n").map((l) => l.trim()));
	const addedLines: string[] = [];
	for (const line of after.split("\n")) {
		if (!beforeLines.has(line.trim()) && line.trim().length > 0) {
			addedLines.push(line);
		}
	}
	return addedLines.join("\n");
}

/**
 * Classify a version bump using deterministic heuristic rules.
 * Returns an array of change signals with confidence scores.
 */
export function classifyHeuristic(input: HeuristicInput): ChangeSignal[] {
	const signals: ChangeSignal[] = [];

	// Package renames are strong major signals
	if (input.packages.renamed.length > 0) {
		for (const rename of input.packages.renamed) {
			signals.push({
				type: "major",
				reason: `Package renamed: ${rename.before} -> ${rename.after}`,
				confidence: 0.9,
				source: "heuristic",
			});
		}
	}

	// Packages removed (without rename) are major signals
	if (input.packages.removed.length > 0) {
		signals.push({
			type: "major",
			reason: `${input.packages.removed.length} package(s) removed`,
			confidence: 0.8,
			source: "heuristic",
		});
	}

	// Check for major text patterns in added content
	const addedText = findAddedText(input.beforeContent, input.afterContent);
	for (const pattern of MAJOR_PATTERNS) {
		if (
			(pattern.test(addedText) || pattern.test(input.afterContent)) &&
			(!pattern.test(input.beforeContent) || pattern.test(addedText))
		) {
			signals.push({
				type: "major",
				reason: `Major change indicator: "${pattern.source}" found in changes`,
				confidence: 0.7,
				source: "heuristic",
			});
			break; // One text pattern signal is enough
		}
	}

	// Sections removed is a major signal
	if (input.structural.sectionsRemoved.length > 0) {
		signals.push({
			type: "major",
			reason: `${input.structural.sectionsRemoved.length} section(s) removed: ${input.structural.sectionsRemoved.join(", ")}`,
			confidence: 0.8,
			source: "heuristic",
		});
	}

	// Sections added is a minor signal
	if (input.structural.sectionsAdded.length > 0) {
		signals.push({
			type: "minor",
			reason: `${input.structural.sectionsAdded.length} section(s) added: ${input.structural.sectionsAdded.join(", ")}`,
			confidence: 0.8,
			source: "heuristic",
		});
	}

	// Code blocks increased is a minor signal
	if (input.structural.codeBlocksDelta > 0) {
		signals.push({
			type: "minor",
			reason: `${input.structural.codeBlocksDelta} code block(s) added`,
			confidence: 0.6,
			source: "heuristic",
		});
	}

	// Check for minor text patterns in added content
	for (const pattern of MINOR_PATTERNS) {
		if (pattern.test(addedText)) {
			signals.push({
				type: "minor",
				reason: `Minor change indicator: "${pattern.source}" found in changes`,
				confidence: 0.7,
				source: "heuristic",
			});
			break; // One text pattern signal is enough
		}
	}

	// Only version numbers changed is a patch signal
	if (input.onlyVersions) {
		signals.push({
			type: "patch",
			reason: "Only version numbers changed in content",
			confidence: 0.8,
			source: "heuristic",
		});
	}

	// Only URLs changed is a patch signal
	if (input.onlyUrls) {
		signals.push({
			type: "patch",
			reason: "Only URLs changed in content",
			confidence: 0.7,
			source: "heuristic",
		});
	}

	// High content similarity is a patch signal
	if (input.similarity > 0.95) {
		signals.push({
			type: "patch",
			reason: `Content similarity is ${(input.similarity * 100).toFixed(1)}%`,
			confidence: 0.7,
			source: "heuristic",
		});
	}

	// If no signals were generated, default to patch with low confidence
	if (signals.length === 0) {
		signals.push({
			type: "patch",
			reason: "No significant changes detected",
			confidence: 0.5,
			source: "heuristic",
		});
	}

	return signals;
}

/**
 * Get the highest priority bump level from a list of signals.
 * Priority: major > minor > patch. Weighted by confidence.
 */
export function highestBump(signals: ChangeSignal[]): { bump: VersionBump; confidence: number } {
	const BUMP_ORDER: Record<VersionBump, number> = { major: 3, minor: 2, patch: 1 };

	let best: { bump: VersionBump; confidence: number } = { bump: "patch", confidence: 0 };
	for (const signal of signals) {
		const order = BUMP_ORDER[signal.type];
		const bestOrder = BUMP_ORDER[best.bump];
		if (order > bestOrder || (order === bestOrder && signal.confidence > best.confidence)) {
			best = { bump: signal.type, confidence: signal.confidence };
		}
	}

	return best;
}
