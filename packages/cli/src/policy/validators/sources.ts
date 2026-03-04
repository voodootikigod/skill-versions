import type { SkillFile } from "../../skill-io.js";
import type { PolicyFinding, SkillPolicy } from "../types.js";

/**
 * Match a source string against a glob pattern.
 * Supports `*` as a wildcard within path segments and `our-org/*` patterns.
 * Also supports `npm:@scope/*` style patterns.
 */
function matchesGlob(source: string, pattern: string): boolean {
	// Escape regex special chars except *, then replace * with .*
	const regexStr = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
	const regex = new RegExp(`^${regexStr}$`);
	return regex.test(source);
}

/**
 * Extract the source identifier from a skill file.
 * Looks at frontmatter fields: source, repository, then falls back to the file path.
 */
function extractSource(file: SkillFile): string | null {
	const fm = file.frontmatter;
	if (typeof fm.source === "string" && fm.source.length > 0) {
		return fm.source;
	}
	if (typeof fm.repository === "string" && fm.repository.length > 0) {
		return fm.repository;
	}
	return null;
}

/**
 * Check a skill file's source against policy allow/deny lists.
 */
export function checkSources(file: SkillFile, policy: SkillPolicy): PolicyFinding[] {
	if (!policy.sources) {
		return [];
	}
	const { allow, deny } = policy.sources;
	if (!(allow || deny)) {
		return [];
	}

	const source = extractSource(file);

	// If no source field and we have an allow list, can't verify compliance
	if (!source && allow && allow.length > 0) {
		return [
			{
				file: file.path,
				severity: "warning",
				rule: "sources",
				message: "Skill has no source/repository field; cannot verify against allow list",
			},
		];
	}

	if (!source) {
		return [];
	}

	const findings: PolicyFinding[] = [];

	// Deny takes precedence over allow
	if (deny) {
		for (const pattern of deny) {
			if (matchesGlob(source, pattern)) {
				findings.push({
					file: file.path,
					severity: "blocked",
					rule: "sources.deny",
					message: `Source "${source}" is in the deny list`,
					detail: `Matched deny pattern: ${pattern}`,
				});
				return findings; // No need to check allow if explicitly denied
			}
		}
	}

	// If allow is specified, everything not in allow is implicitly denied
	if (allow && allow.length > 0) {
		const allowed = allow.some((pattern) => matchesGlob(source, pattern));
		if (!allowed) {
			findings.push({
				file: file.path,
				severity: "blocked",
				rule: "sources.allow",
				message: `Source "${source}" is not in the allow list`,
				detail: "Only skills from approved sources may be installed",
			});
		}
	}

	return findings;
}
