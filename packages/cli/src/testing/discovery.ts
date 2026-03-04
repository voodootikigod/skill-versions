import { stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { discoverSkillFiles } from "../shared/discovery.js";
import { readSkillFile } from "../skill-io.js";
import type { SkillFile } from "../skill-io.js";

export interface TestableSkill {
	skillPath: string;
	skillFile: SkillFile;
	testsDir: string;
	casesPath: string;
}

/**
 * Discover skills that have a tests/ directory with a cases.yaml or cases.yml file.
 * Optionally filter by skill name.
 */
export async function discoverTestableSkills(
	dir: string,
	skillFilter?: string,
): Promise<TestableSkill[]> {
	const skillPaths = await discoverSkillFiles(dir);
	const results: TestableSkill[] = [];

	for (const skillPath of skillPaths) {
		const skillDir = dirname(skillPath);
		const skillName = basename(skillDir);

		// Filter by name if specified
		if (skillFilter && skillName !== skillFilter) {
			continue;
		}

		const testsDir = join(skillDir, "tests");

		// Check for cases.yaml or cases.yml
		let casesPath: string | null = null;
		for (const name of ["cases.yaml", "cases.yml"]) {
			const candidate = join(testsDir, name);
			try {
				const info = await stat(candidate);
				if (info.isFile()) {
					casesPath = candidate;
					break;
				}
			} catch {
				// File doesn't exist, try next
			}
		}

		if (!casesPath) {
			continue;
		}

		const skillFile = await readSkillFile(skillPath);
		results.push({ skillPath, skillFile, testsDir, casesPath });
	}

	return results;
}
