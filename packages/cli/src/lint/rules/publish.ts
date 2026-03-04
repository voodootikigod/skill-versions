import type { SkillFile } from "../../skill-io.js";
import { isValidSpdx } from "../spdx.js";
import type { LintFinding } from "../types.js";

/**
 * Check fields required for publishing a skill to a registry.
 *
 * These fields are required for `npx skills publish`:
 * - author: non-empty string (fixable via git config)
 * - license: valid SPDX identifier (fixable with MIT default)
 * - repository: valid URL (fixable via git remote)
 */
export function checkPublishReady(file: SkillFile): LintFinding[] {
	const findings: LintFinding[] = [];
	const fm = file.frontmatter;

	// author
	if (!fm.author || (typeof fm.author === "string" && fm.author.trim() === "")) {
		findings.push({
			file: file.path,
			field: "author",
			level: "error",
			message: "Missing required field for publish: author",
			fixable: true,
		});
	} else if (typeof fm.author !== "string") {
		findings.push({
			file: file.path,
			field: "author",
			level: "error",
			message: `Field 'author' must be a string, got ${typeof fm.author}`,
			fixable: false,
		});
	}

	// license
	if (!fm.license || (typeof fm.license === "string" && fm.license.trim() === "")) {
		findings.push({
			file: file.path,
			field: "license",
			level: "error",
			message: "Missing required field for publish: license",
			fixable: true,
		});
	} else if (typeof fm.license === "string" && !isValidSpdx(fm.license)) {
		findings.push({
			file: file.path,
			field: "license",
			level: "error",
			message: `Invalid SPDX license identifier: "${fm.license}"`,
			fixable: false,
		});
	}

	// repository
	if (!fm.repository || (typeof fm.repository === "string" && fm.repository.trim() === "")) {
		findings.push({
			file: file.path,
			field: "repository",
			level: "error",
			message: "Missing required field for publish: repository",
			fixable: true,
		});
	} else if (typeof fm.repository === "string") {
		try {
			new URL(fm.repository);
		} catch {
			findings.push({
				file: file.path,
				field: "repository",
				level: "error",
				message: `Field 'repository' is not a valid URL: "${fm.repository}"`,
				fixable: false,
			});
		}
	}

	return findings;
}
