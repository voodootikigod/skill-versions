import type { SkillFile } from "../../skill-io.js";
import type { LintFinding } from "../types.js";

/**
 * Check recommended frontmatter fields.
 *
 * These fields are not required but improve discoverability and tooling:
 * - spec-version: which version of the Agent Skills spec the skill conforms to
 * - keywords: discovery tags (array with at least 1 item)
 */
export function checkRecommended(file: SkillFile): LintFinding[] {
	const findings: LintFinding[] = [];
	const fm = file.frontmatter;

	// spec-version
	if (!fm["spec-version"]) {
		findings.push({
			file: file.path,
			field: "spec-version",
			level: "info",
			message: "Missing recommended field: spec-version",
			fixable: false,
		});
	} else if (typeof fm["spec-version"] !== "string") {
		findings.push({
			file: file.path,
			field: "spec-version",
			level: "info",
			message: `Field 'spec-version' should be a string, got ${typeof fm["spec-version"]}`,
			fixable: false,
		});
	}

	// keywords
	if (!fm.keywords) {
		findings.push({
			file: file.path,
			field: "keywords",
			level: "info",
			message: "Missing recommended field: keywords",
			fixable: false,
		});
	} else if (!Array.isArray(fm.keywords)) {
		findings.push({
			file: file.path,
			field: "keywords",
			level: "info",
			message: `Field 'keywords' should be an array, got ${typeof fm.keywords}`,
			fixable: false,
		});
	} else if (fm.keywords.length === 0) {
		findings.push({
			file: file.path,
			field: "keywords",
			level: "info",
			message: "Field 'keywords' is empty; add at least one keyword for discoverability",
			fixable: false,
		});
	}

	return findings;
}
