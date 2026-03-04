import { detectsProduct } from "../../lint/detection/product-refs.js";
import type { SkillFile } from "../../skill-io.js";
import type { PolicyFinding, SkillPolicy } from "../types.js";

/**
 * Check staleness/freshness policy rules for a skill file.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
export function checkFreshness(file: SkillFile, policy: SkillPolicy): PolicyFinding[] {
	if (!policy.freshness) {
		return [];
	}

	const findings: PolicyFinding[] = [];
	const fm = file.frontmatter;

	// Check max_age_days against last-verified
	if (policy.freshness.max_age_days !== undefined) {
		const lastVerified = fm["last-verified"];
		if (typeof lastVerified === "string") {
			const verifiedDate = new Date(lastVerified);
			if (!Number.isNaN(verifiedDate.getTime())) {
				const ageDays = Math.floor((Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24));
				if (ageDays > policy.freshness.max_age_days) {
					findings.push({
						file: file.path,
						severity: "warning",
						rule: "freshness.max_age_days",
						message: `Last verified ${ageDays} days ago (max: ${policy.freshness.max_age_days} days)`,
					});
				}
			}
		} else {
			// No last-verified date at all
			findings.push({
				file: file.path,
				severity: "warning",
				rule: "freshness.max_age_days",
				message: "No last-verified date found; cannot check freshness",
			});
		}
	}

	// Check require_product_version
	if (policy.freshness.require_product_version) {
		const hasProductVersion =
			fm["product-version"] !== undefined &&
			fm["product-version"] !== null &&
			fm["product-version"] !== "";

		if (!hasProductVersion) {
			// Only flag if the skill references a product
			const refsProduct = detectsProduct(file.content);
			if (refsProduct) {
				findings.push({
					file: file.path,
					severity: "violation",
					rule: "freshness.require_product_version",
					message: "Skill references a product but does not declare product-version",
				});
			}
		}
	}

	// Check max_version_drift against product-version
	if (policy.freshness.max_version_drift && fm["product-version"]) {
		// Version drift checking requires network access to compare against current version.
		// This is handled at the orchestrator level via the audit integration or
		// by the existing `check` command. Here we just verify the field exists.
		// A more thorough implementation could call fetchLatestVersion() but that
		// would add network dependency to a validator — better left to audit integration.
	}

	return findings;
}
