const SEMVER_RE = /\b\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?(?:\+[\w.]+)?\b/g;
const URL_RE = /https?:\/\/[^\s)>\]]+/g;
const WHITESPACE_RE = /\s+/;

function tokenize(text: string): Set<string> {
	return new Set(
		text
			.toLowerCase()
			.split(WHITESPACE_RE)
			.filter((w) => w.length > 0)
	);
}

/**
 * Compute word-level Jaccard similarity between two strings (0.0 to 1.0).
 * Normalizes whitespace and case before comparison.
 */
export function contentSimilarity(before: string, after: string): number {
	const wordsA = tokenize(before);
	const wordsB = tokenize(after);

	if (wordsA.size === 0 && wordsB.size === 0) {
		return 1.0;
	}

	let intersection = 0;
	for (const word of wordsA) {
		if (wordsB.has(word)) {
			intersection++;
		}
	}

	const union = new Set([...wordsA, ...wordsB]).size;
	if (union === 0) {
		return 1.0;
	}

	return intersection / union;
}

/**
 * Check whether only version numbers differ between two strings.
 * Replaces all semver-like patterns with a placeholder and compares.
 */
export function onlyVersionsChanged(before: string, after: string): boolean {
	const normalizedBefore = before.replace(SEMVER_RE, "VERSION_PLACEHOLDER");
	const normalizedAfter = after.replace(SEMVER_RE, "VERSION_PLACEHOLDER");
	return normalizedBefore === normalizedAfter && before !== after;
}

/**
 * Check whether only URLs differ between two strings.
 * Replaces all URLs with a placeholder and compares.
 */
export function onlyUrlsChanged(before: string, after: string): boolean {
	const normalizedBefore = before.replace(URL_RE, "URL_PLACEHOLDER");
	const normalizedAfter = after.replace(URL_RE, "URL_PLACEHOLDER");
	return normalizedBefore === normalizedAfter && before !== after;
}
