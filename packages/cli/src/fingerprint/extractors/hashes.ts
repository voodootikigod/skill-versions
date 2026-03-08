import { createHash } from "node:crypto";
import { countTokens } from "../../budget/tokenizer.js";

/**
 * Watermark format: <!-- skill:name/version source -->
 * Source is optional.
 */
const WATERMARK_RE = /<!--\s*skill:([^/\s]+)\/(\S+?)(?:\s+(\S+))?\s*-->/;

export interface WatermarkInfo {
	name: string;
	source?: string;
	version: string;
}

/**
 * Extract watermark from skill content.
 */
export function extractWatermark(content: string): WatermarkInfo | null {
	const match = WATERMARK_RE.exec(content);
	if (!match) {
		return null;
	}
	return {
		name: match[1],
		version: match[2],
		source: match[3] || undefined,
	};
}

/**
 * Generate a watermark comment string.
 */
export function generateWatermark(name: string, version: string, source?: string): string {
	const parts = [`skill:${name}/${version}`];
	if (source) {
		parts.push(source);
	}
	return `<!-- ${parts.join(" ")} -->`;
}

/**
 * Compute a SHA-256 hash of the given text.
 */
function computeHash(text: string): string {
	return createHash("sha256").update(text, "utf-8").digest("hex");
}

/**
 * Compute SHA-256 of raw YAML frontmatter (between --- markers).
 */
export function computeFrontmatterHash(frontmatterRaw: string): string {
	return computeHash(frontmatterRaw);
}

/**
 * Normalize content for hashing: collapse whitespace, strip HTML comments.
 */
export function normalizeContent(content: string): string {
	return content
		.replace(/<!--[\s\S]*?-->/g, "") // strip HTML comments
		.replace(/\s+/g, " ") // collapse whitespace
		.trim();
}

/**
 * Compute SHA-256 of normalized full content.
 */
export function computeContentHash(content: string): string {
	return computeHash(normalizeContent(content));
}

/**
 * Compute SHA-256 of first 500 tokens of normalized content.
 * Uses a word-estimate approach to avoid O(n^2) tokenizer calls.
 */
export function computePrefixHash(content: string): string {
	const normalized = normalizeContent(content);
	const totalTokens = countTokens(normalized);
	if (totalTokens <= 500) {
		return computeHash(normalized);
	}
	// Estimate ~1.3 tokens per word, start with ~385 words then adjust
	const words = normalized.split(/\s+/);
	const estimate = Math.min(words.length, 385);
	let prefix = words.slice(0, estimate).join(" ");
	let tc = countTokens(prefix);

	if (tc <= 500) {
		// Add more words until we exceed 500
		for (let i = estimate; i < words.length; i++) {
			const next = `${prefix} ${words[i]}`;
			const nextTc = countTokens(next);
			if (nextTc > 500) {
				break;
			}
			prefix = next;
			tc = nextTc;
		}
	} else {
		// Overshot — binary search down
		let lo = 0;
		let hi = estimate;
		while (lo < hi) {
			const mid = Math.floor((lo + hi + 1) / 2);
			const candidate = words.slice(0, mid).join(" ");
			if (countTokens(candidate) <= 500) {
				lo = mid;
			} else {
				hi = mid - 1;
			}
		}
		prefix = words.slice(0, lo).join(" ");
	}
	return computeHash(prefix);
}

/**
 * Inject a watermark comment after frontmatter.
 * Returns the modified content and whether injection succeeded.
 */
export function injectWatermarkIntoContent(
	raw: string,
	name: string,
	version: string,
	source?: string
): { content: string; injected: boolean } {
	const wm = generateWatermark(name, version, source);
	const result = raw.replace(/^(---[\s\S]*?---\r?\n?)/, `$1${wm}\n`);
	return { content: result, injected: result !== raw };
}

/**
 * Extract raw frontmatter string from SKILL.md content.
 */
export function extractRawFrontmatter(raw: string): string | null {
	const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
	return match ? match[1] : null;
}
