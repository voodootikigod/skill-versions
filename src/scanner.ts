import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import type { ScannedSkill } from "./types.js";

/**
 * Scan a directory of skills for SKILL.md files and extract frontmatter.
 * Expects directory structure: skills/{skill-name}/SKILL.md
 */
export async function scanSkills(skillsDir: string): Promise<ScannedSkill[]> {
	const skills: ScannedSkill[] = [];

	let entries: string[];
	try {
		entries = await readdir(skillsDir);
	} catch {
		throw new Error(`Cannot read skills directory: ${skillsDir}`);
	}

	for (const entry of entries) {
		const skillPath = join(skillsDir, entry, "SKILL.md");

		try {
			const info = await stat(join(skillsDir, entry));
			if (!info.isDirectory()) continue;
		} catch {
			continue;
		}

		let content: string;
		try {
			content = await readFile(skillPath, "utf-8");
		} catch {
			// No SKILL.md in this directory, skip
			continue;
		}

		try {
			const { data } = matter(content);
			const skill: ScannedSkill = {
				name: (data.name as string) ?? entry,
				path: skillPath,
			};

			// Top-level product-version (most common format)
			if (typeof data["product-version"] === "string") {
				skill.productVersion = data["product-version"];
			}

			// Also check nested metadata.product-version
			if (!skill.productVersion && data.metadata && typeof data.metadata === "object") {
				const meta = data.metadata as Record<string, unknown>;
				if (typeof meta["product-version"] === "string") {
					skill.productVersion = meta["product-version"];
				}
			}

			// Product name from metadata.product or top-level product
			if (data.metadata && typeof data.metadata === "object") {
				const meta = data.metadata as Record<string, unknown>;
				if (typeof meta.product === "string") {
					skill.product = meta.product;
				}
			}
			if (!skill.product && typeof data.product === "string") {
				skill.product = data.product;
			}

			skills.push(skill);
		} catch {
			// Malformed frontmatter, skip with warning
			skills.push({
				name: entry,
				path: skillPath,
			});
		}
	}

	return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Group scanned skills by inferred product.
 *
 * Strategy: skills with the same name prefix AND the same product-version
 * belong to the same product. Stand-alone skills (no shared prefix) or
 * skills with different versions are separate groups.
 *
 * Returns Map<productKey, ScannedSkill[]>
 */
export function groupSkills(
	skills: ScannedSkill[],
): Map<string, ScannedSkill[]> {
	// Build version lookup: name -> version
	const versionMap = new Map<string, string>();
	for (const skill of skills) {
		if (skill.productVersion) {
			versionMap.set(skill.name, skill.productVersion);
		}
	}

	const allNames = [...versionMap.keys()];
	const groups = new Map<string, ScannedSkill[]>();

	for (const skill of skills) {
		if (!skill.productVersion) continue;

		const key = inferGroupKey(skill.name, skill.productVersion, allNames, versionMap);
		const existing = groups.get(key) ?? [];
		existing.push(skill);
		groups.set(key, existing);
	}

	return groups;
}

/**
 * Infer a group key for a skill by finding a prefix shared with other skills
 * that have the SAME version. Falls back to the skill name itself.
 */
function inferGroupKey(
	name: string,
	version: string,
	allNames: string[],
	versionMap: Map<string, string>,
): string {
	const parts = name.split("-");

	// Try progressively shorter prefixes (at least 1 segment)
	for (let len = parts.length - 1; len >= 1; len--) {
		const prefix = parts.slice(0, len).join("-");

		// Check if any other skill shares this prefix AND same version
		let hasOther = false;
		for (const other of allNames) {
			if (other !== name && other.startsWith(`${prefix}-`) && versionMap.get(other) === version) {
				hasOther = true;
				break;
			}
		}
		if (hasOther) return prefix;
	}

	// No shared prefix with same version — use the full name
	return name;
}
