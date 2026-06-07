import { basename, dirname } from "node:path";
import { valid as semverValid, validRange as semverValidRange } from "semver";
import { parseCompatibility } from "../../compatibility/index.js";
import type { SkillFile } from "../../skill-io.js";
import { resolveField, SPEC_FIELDS } from "../field-resolver.js";

const LOWERCASE_START_RE = /^[a-z]/;

import { isValidSpdx } from "../spdx.js";
import type { LintFinding } from "../types.js";

/**
 * Spec-compliant name pattern:
 * - Unicode lowercase letters (\p{Ll}), digits, hyphens only
 * - No leading/trailing hyphens
 * - No consecutive hyphens
 * - Must start with a letter or digit
 */
const SPEC_NAME_RE = /^[\p{Ll}0-9](?:[\p{Ll}0-9]|-(?=[\p{Ll}0-9]))*$/u;

/**
 * Regular expressions for allowed-tools validation:
 * - ALLOWED_TOOLS_SPLIT_RE: splits space-delimited list of tools
 * - ALLOWED_TOOL_DECLARATION_RE: matches Name or Name(constraints)
 */
const ALLOWED_TOOLS_SPLIT_RE = /\s+/;
const ALLOWED_TOOL_DECLARATION_RE = /^[A-Z][a-zA-Z0-9]*(?:\([^)]*\))?$/;

/**
 * Check the format/validity of frontmatter field values.
 *
 * Only validates fields that are present — missing fields are handled by
 * the required/publish/conditional/recommended rules.
 *
 * Validations:
 * - name: spec-compliant (lowercase, hyphens, digits, max 64 chars, NFKC)
 * - product-version: must be valid semver
 * - compatibility: each @semver portion must be a valid semver range, max 500 chars
 * - repository: must be a valid URL
 * - license: SPDX check (info-level, not error — spec allows any string)
 * - allowed-tools: accepted as string (experimental spec field)
 * - metadata: values should be strings
 * - unknown top-level fields: info-level warning for non-spec fields
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: validates many fields
export function checkFormats(file: SkillFile): LintFinding[] {
	const findings: LintFinding[] = [];
	const fm = file.frontmatter;

	// name: spec-compliant validation
	if (fm.name && typeof fm.name === "string") {
		const normalized = fm.name.normalize("NFKC");
		if (!SPEC_NAME_RE.test(normalized)) {
			findings.push({
				file: file.path,
				field: "name",
				level: "warning",
				message: `Field 'name' does not conform to the Agent Skills spec: "${fm.name}" (must be lowercase letters, digits, and non-consecutive hyphens only)`,
				fixable: false,
			});
		}

		// Directory name match check
		const dirName = basename(dirname(file.path));
		if (dirName && dirName !== normalized) {
			findings.push({
				file: file.path,
				field: "name",
				level: "warning",
				message: `Field 'name' ("${fm.name}") does not match parent directory name ("${dirName}")`,
				fixable: false,
			});
		}
	}

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

	// compatibility: each @version portion must be a valid semver range, max 500 chars
	if (fm.compatibility && typeof fm.compatibility === "string") {
		if (fm.compatibility.length > 500) {
			findings.push({
				file: file.path,
				field: "compatibility",
				level: "error",
				message: `Field 'compatibility' exceeds maximum length of 500 characters (${fm.compatibility.length})`,
				fixable: false,
			});
		}

		const entries = parseCompatibility(fm.compatibility);
		for (const entry of entries) {
			if (entry.version && !semverValidRange(entry.version)) {
				findings.push({
					file: file.path,
					field: "compatibility",
					level: "error",
					message: `Invalid semver range in 'compatibility': "${entry.raw}"`,
					fixable: false,
				});
			}
		}
	}

	// repository: valid URL
	const repository = resolveField(fm, "repository");
	if (repository && typeof repository === "string") {
		try {
			new URL(repository);
		} catch {
			findings.push({
				file: file.path,
				field: "repository",
				level: "error",
				message: `Invalid URL for 'repository': "${repository}"`,
				fixable: false,
			});
		}
	}

	// license: SPDX check (consolidated with publish.ts)
	const license = resolveField(fm, "license");
	if (license && typeof license === "string" && !isValidSpdx(license)) {
		findings.push({
			file: file.path,
			field: "license",
			level: "warning",
			message: `License "${license}" is not a recognized SPDX identifier. Valid SPDX is recommended for npm publishing.`,
			fixable: false,
		});
	}

	// allowed-tools: if present, must be a string and have valid declarations
	const allowedTools = resolveField(fm, "allowed-tools");
	if (allowedTools !== undefined) {
		if (typeof allowedTools === "string") {
			const tools = allowedTools.split(ALLOWED_TOOLS_SPLIT_RE).filter(Boolean);
			for (const tool of tools) {
				if (!ALLOWED_TOOL_DECLARATION_RE.test(tool)) {
					if (LOWERCASE_START_RE.test(tool)) {
						const capitalized = tool[0].toUpperCase() + tool.slice(1);
						findings.push({
							file: file.path,
							field: "allowed-tools",
							level: "warning",
							message: `Tool name in '${tool}' must be capitalized (e.g., '&quot;${capitalized}&quot;'.replace(/&quot;/g, '"'))`,
							fixable: false,
						});
					} else {
						findings.push({
							file: file.path,
							field: "allowed-tools",
							level: "warning",
							message: `Invalid tool declaration format in 'allowed-tools': "${tool}" (should match 'Name' or 'Name(constraints)', e.g., 'Bash(git:*)')`,
							fixable: false,
						});
					}
				}
			}
		} else {
			findings.push({
				file: file.path,
				field: "allowed-tools",
				level: "error",
				message: `Field 'allowed-tools' must be a string, got ${typeof allowedTools}`,
				fixable: false,
			});
		}
	}

	// metadata: values should be strings per spec
	if (fm.metadata && typeof fm.metadata === "object" && !Array.isArray(fm.metadata)) {
		const meta = fm.metadata as Record<string, unknown>;
		for (const [key, value] of Object.entries(meta)) {
			if (value !== undefined && value !== null && typeof value !== "string") {
				findings.push({
					file: file.path,
					field: `metadata.${key}`,
					level: "info",
					message: `Metadata value for '${key}' should be a string per the Agent Skills spec, got ${typeof value}`,
					fixable: false,
				});
			}
		}
	}

	// Unknown top-level fields: warn about non-spec fields
	for (const key of Object.keys(fm)) {
		if (!SPEC_FIELDS.has(key)) {
			findings.push({
				file: file.path,
				field: key,
				level: "info",
				message: `Field '${key}' is not defined in the Agent Skills spec. Consider moving it to metadata.${key}`,
				fixable: false,
			});
		}
	}

	return findings;
}
