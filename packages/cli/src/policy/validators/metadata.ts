import { isValidSpdx } from "../../lint/spdx.js";
import type { SkillFile } from "../../skill-io.js";
import type { PolicyFinding, SkillPolicy } from "../types.js";

/**
 * Check that a skill file meets metadata requirements from the policy.
 */
export function checkMetadata(file: SkillFile, policy: SkillPolicy): PolicyFinding[] {
	if (!policy.metadata) {
		return [];
	}

	const findings: PolicyFinding[] = [];
	const fm = file.frontmatter;

	// Check required fields
	if (policy.metadata.required_fields) {
		for (const field of policy.metadata.required_fields) {
			const value = fm[field];
			if (value === undefined || value === null || value === "") {
				findings.push({
					file: file.path,
					severity: "violation",
					rule: "metadata.required_fields",
					message: `Missing required field: ${field}`,
				});
			}
		}
	}

	// Check license requirement
	if (policy.metadata.require_license) {
		const license = fm.license;
		if (typeof license !== "string" || license.length === 0) {
			findings.push({
				file: file.path,
				severity: "violation",
				rule: "metadata.require_license",
				message: "Missing required license field",
			});
		} else if (!isValidSpdx(license)) {
			findings.push({
				file: file.path,
				severity: "violation",
				rule: "metadata.require_license",
				message: `Invalid SPDX license identifier: "${license}"`,
			});
		}
	}

	// Check allowed licenses
	if (policy.metadata.allowed_licenses && policy.metadata.allowed_licenses.length > 0) {
		const license = fm.license;
		if (
			typeof license === "string" &&
			license.length > 0 &&
			!policy.metadata.allowed_licenses.includes(license)
		) {
			findings.push({
				file: file.path,
				severity: "violation",
				rule: "metadata.allowed_licenses",
				message: `License "${license}" is not in the allowed list`,
				detail: `Allowed: ${policy.metadata.allowed_licenses.join(", ")}`,
			});
		}
	}

	return findings;
}
