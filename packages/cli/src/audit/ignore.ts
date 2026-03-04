import { readFile } from "node:fs/promises";
import type { AuditCategory, AuditFinding } from "./types.js";

export interface IgnoreRule {
	category?: AuditCategory;
	file?: string;
}

const INLINE_IGNORE_RE = /<!--\s*audit-ignore(?::?\s*([\w-]+))?\s*-->/;

/**
 * Load ignore rules from a .skillsafeignore file.
 *
 * Format (one rule per line):
 *   hallucinated-package          # ignore all hallucinated-package findings
 *   prompt-injection:skills/foo/  # ignore prompt-injection in files matching path
 *   dangerous-command             # ignore all dangerous-command findings
 *   # comments start with #
 */
export async function loadIgnoreRules(ignorePath?: string): Promise<IgnoreRule[]> {
	const path = ignorePath ?? ".skillsafeignore";
	let content: string;
	try {
		content = await readFile(path, "utf-8");
	} catch {
		return [];
	}

	const rules: IgnoreRule[] = [];

	for (const rawLine of content.split("\n")) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) {
			continue;
		}

		const colonIndex = line.indexOf(":");
		if (colonIndex > 0) {
			const category = line.slice(0, colonIndex).trim() as AuditCategory;
			const file = line.slice(colonIndex + 1).trim();
			rules.push({ category, file: file || undefined });
		} else {
			rules.push({ category: line as AuditCategory });
		}
	}

	return rules;
}

/**
 * Check if a finding should be ignored based on ignore rules or inline comments.
 */
export function shouldIgnore(
	finding: AuditFinding,
	rules: IgnoreRule[],
	rawContent: string
): boolean {
	// Check .skillsafeignore rules
	for (const rule of rules) {
		const categoryMatch = !rule.category || rule.category === finding.category;
		const fileMatch = !rule.file || finding.file.includes(rule.file);
		if (categoryMatch && fileMatch) {
			return true;
		}
	}

	// Check inline <!-- audit-ignore --> comments on the previous line
	const lines = rawContent.split("\n");
	const lineIndex = finding.line - 1;
	if (lineIndex > 0) {
		const prevLine = lines[lineIndex - 1];
		const match = prevLine?.match(INLINE_IGNORE_RE);
		if (match) {
			// If no category specified, ignore all findings on this line
			if (!match[1]) {
				return true;
			}
			// If category specified, only ignore matching category
			if (match[1] === finding.category) {
				return true;
			}
		}
	}

	return false;
}
