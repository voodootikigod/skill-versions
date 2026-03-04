import type { ExtractedUrl } from "../types.js";

// Markdown links: [text](url)
const MD_LINK_RE = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;

// Bare URLs (not already inside markdown link syntax)
const BARE_URL_RE = /(?<!\]\()https?:\/\/[^\s)>]+/g;

export function extractUrls(content: string): ExtractedUrl[] {
	const results: ExtractedUrl[] = [];
	const seen = new Set<string>();
	const lines = content.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNumber = i + 1;

		// Markdown links
		for (const match of line.matchAll(MD_LINK_RE)) {
			const url = match[2];
			if (url && !seen.has(url)) {
				seen.add(url);
				results.push({ url, line: lineNumber, text: match[1] });
			}
		}

		// Bare URLs (skip those already captured as markdown links)
		for (const match of line.matchAll(BARE_URL_RE)) {
			const url = match[0];
			if (!seen.has(url)) {
				seen.add(url);
				results.push({ url, line: lineNumber });
			}
		}
	}

	return results;
}
