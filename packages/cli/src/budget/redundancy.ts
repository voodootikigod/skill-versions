import type { RedundancyMatch, SkillBudget } from "./types.js";

const WHITESPACE_RE = /\s+/;

/**
 * Tokenize text into word-level n-grams for Jaccard similarity comparison.
 */
function extractNgrams(text: string, n: number): Set<string> {
	const words = text
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.split(WHITESPACE_RE)
		.filter((w) => w.length > 0);

	const ngrams = new Set<string>();
	for (let i = 0; i <= words.length - n; i++) {
		ngrams.add(words.slice(i, i + n).join(" "));
	}
	return ngrams;
}

/**
 * Compute the Jaccard similarity between two sets.
 * Returns a value between 0 (no overlap) and 1 (identical).
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 && b.size === 0) {
		return 0;
	}

	let intersection = 0;
	// Iterate over the smaller set for efficiency
	const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
	for (const item of smaller) {
		if (larger.has(item)) {
			intersection++;
		}
	}

	const union = a.size + b.size - intersection;
	return union === 0 ? 0 : intersection / union;
}

/**
 * Detect redundancy between skill files using 4-gram Jaccard similarity.
 *
 * @param skills - Analyzed skill budgets (needs access to content via a lookup)
 * @param threshold - Minimum Jaccard similarity to flag (default 0.2)
 * @param contentMap - Map from skill path to raw content for n-gram extraction
 */
export function detectRedundancy(
	skills: SkillBudget[],
	contentMap: Map<string, string>,
	threshold = 0.2
): RedundancyMatch[] {
	if (skills.length < 2) {
		return [];
	}

	// Pre-compute n-grams for each skill
	const ngramMap = new Map<string, Set<string>>();
	for (const skill of skills) {
		const content = contentMap.get(skill.path) ?? "";
		ngramMap.set(skill.path, extractNgrams(content, 4));
	}

	const matches: RedundancyMatch[] = [];

	// Compare all pairs
	for (let i = 0; i < skills.length; i++) {
		for (let j = i + 1; j < skills.length; j++) {
			const a = skills[i];
			const b = skills[j];
			const ngramsA = ngramMap.get(a.path) ?? new Set<string>();
			const ngramsB = ngramMap.get(b.path) ?? new Set<string>();

			const similarity = jaccardSimilarity(ngramsA, ngramsB);

			if (similarity >= threshold) {
				// Estimate overlapping tokens as the minimum of the two times similarity
				const overlapTokens = Math.round(Math.min(a.totalTokens, b.totalTokens) * similarity);

				matches.push({
					skillA: a.path,
					skillB: b.path,
					nameA: a.name,
					nameB: b.name,
					similarity: Math.round(similarity * 1000) / 1000,
					overlapTokens,
					suggestion: `${a.name} and ${b.name} share ~${overlapTokens.toLocaleString()} tokens of overlapping content (${Math.round(similarity * 100)}% similarity). Consider consolidating shared sections into a common dependency or using feature flags.`,
				});
			}
		}
	}

	// Sort by similarity descending
	matches.sort((a, b) => b.similarity - a.similarity);

	return matches;
}
