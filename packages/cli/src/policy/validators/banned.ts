import type { SkillFile } from "../../skill-io.js";
import type { PolicyFinding, SkillPolicy } from "../types.js";

/**
 * Match a skill name against a glob pattern.
 */
function matchesGlob(name: string, pattern: string): boolean {
	const regexStr = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
	const regex = new RegExp(`^${regexStr}$`);
	return regex.test(name);
}

/**
 * Check if a skill is banned by the policy.
 */
export function checkBanned(file: SkillFile, policy: SkillPolicy): PolicyFinding[] {
	if (!policy.banned || policy.banned.length === 0) {
		return [];
	}

	const name = file.frontmatter.name;
	if (typeof name !== "string" || name.length === 0) {
		return [];
	}

	const findings: PolicyFinding[] = [];

	for (const ban of policy.banned) {
		if (matchesGlob(name, ban.skill)) {
			findings.push({
				file: file.path,
				severity: "blocked",
				rule: "banned",
				message: `Skill "${name}" is banned`,
				detail: ban.reason ?? undefined,
			});
		}
	}

	return findings;
}
