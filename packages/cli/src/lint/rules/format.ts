import { valid as semverValid } from "semver";
import type { SkillFile } from "../../skill-io.js";
import { isValidSpdx } from "../spdx.js";
import type { LintFinding } from "../types.js";

const NAME_PATTERN_RE = /^[@a-zA-Z0-9][\w./-]*$/;

/**
 * Check the format/validity of frontmatter field values.
 *
 * Only validates fields that are present — missing fields are handled by
 * the required/publish/conditional/recommended rules.
 *
 * Validations:
 * - product-version: must be valid semver
 * - repository: must be a valid URL
 * - license: must be a valid SPDX expression
 * - name: must not contain special characters beyond hyphens and dots
 */
export function checkFormats(file: SkillFile): LintFinding[] {
	const findings: LintFinding[] = [];
	const fm = file.frontmatter;

	// product-version: valid semver
	if (
		fm["product-version"] &&
		typeof fm["product-version"] === "string" &&
		!semverValid(fm["product-version"])
	) {
		findings.push({
			file: file.path,
			field: "product-version",
			level: "error",
			message: `Invalid semver for 'product-version': "${fm["product-version"]}"`,
			fixable: false,
		});
	}

	// repository: valid URL
	if (fm.repository && typeof fm.repository === "string") {
		try {
			new URL(fm.repository);
		} catch {
			findings.push({
				file: file.path,
				field: "repository",
				level: "error",
				message: `Invalid URL for 'repository': "${fm.repository}"`,
				fixable: false,
			});
		}
	}

	// license: valid SPDX
	if (fm.license && typeof fm.license === "string" && !isValidSpdx(fm.license)) {
		findings.push({
			file: file.path,
			field: "license",
			level: "error",
			message: `Invalid SPDX license identifier: "${fm.license}"`,
			fixable: false,
		});
	}

	// name: no special characters beyond hyphens, dots, slashes, and @
	if (fm.name && typeof fm.name === "string" && !NAME_PATTERN_RE.test(fm.name)) {
		findings.push({
			file: file.path,
			field: "name",
			level: "error",
			message: `Field 'name' contains invalid characters: "${fm.name}" (use only letters, numbers, hyphens, dots)`,
			fixable: false,
		});
	}

	return findings;
}
