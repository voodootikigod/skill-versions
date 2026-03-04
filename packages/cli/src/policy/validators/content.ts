import type { SkillFile } from "../../skill-io.js";
import type { PolicyFinding, SkillPolicy } from "../types.js";

/**
 * Find the line number of a regex match within content.
 */
function findLineNumber(content: string, pattern: RegExp): number | undefined {
	const lines = content.split("\n");
	for (let i = 0; i < lines.length; i++) {
		if (pattern.test(lines[i])) {
			return i + 1; // 1-indexed
		}
	}
	return undefined;
}

/**
 * Check skill file content against deny/require pattern rules.
 */
export function checkContent(file: SkillFile, policy: SkillPolicy): PolicyFinding[] {
	if (!policy.content) {
		return [];
	}

	const findings: PolicyFinding[] = [];
	const content = file.raw;

	// Deny patterns: flag matches
	if (policy.content.deny_patterns) {
		for (const dp of policy.content.deny_patterns) {
			let regex: RegExp;
			try {
				regex = new RegExp(dp.pattern, "m");
			} catch {
				continue; // Skip invalid regex (should be caught by validation)
			}

			const match = regex.exec(content);
			if (match) {
				const line = findLineNumber(content, regex);
				findings.push({
					file: file.path,
					severity: "violation",
					rule: "content.deny_patterns",
					message: `Contains denied pattern: ${dp.pattern}`,
					detail: dp.reason,
					line,
				});
			}
		}
	}

	// Require patterns: flag absences
	if (policy.content.require_patterns) {
		for (const rp of policy.content.require_patterns) {
			let regex: RegExp;
			try {
				regex = new RegExp(rp.pattern, "m");
			} catch {
				continue;
			}

			if (!regex.test(content)) {
				findings.push({
					file: file.path,
					severity: "violation",
					rule: "content.require_patterns",
					message: `Missing required pattern: ${rp.pattern}`,
					detail: rp.reason,
				});
			}
		}
	}

	return findings;
}
