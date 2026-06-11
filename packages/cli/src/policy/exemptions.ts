import { matchesGlob } from "../shared/glob.js";
import type { PolicyExemption, PolicyFinding } from "./types.js";

/** True when an exemption has no expiry or its expiry is still in the future. */
export function isExemptionActive(exemption: PolicyExemption, now: Date): boolean {
	if (!exemption.expires) {
		return true;
	}
	const expiry = new Date(exemption.expires);
	if (Number.isNaN(expiry.getTime())) {
		// Unparseable date — treat as inactive (fail-closed: do not suppress).
		return false;
	}
	return expiry.getTime() > now.getTime();
}

/**
 * Whether an exemption applies to a finding. The rule must match exactly or via
 * "*", and — when the exemption is scoped to a skill — the finding's skill name
 * must match that glob.
 */
export function exemptionMatches(
	exemption: PolicyExemption,
	finding: PolicyFinding,
	skillName: string | undefined
): boolean {
	const ruleMatch = exemption.rule === "*" || exemption.rule === finding.rule;
	if (!ruleMatch) {
		return false;
	}
	if (!exemption.skill) {
		return true;
	}
	if (!skillName) {
		return false;
	}
	return matchesGlob(skillName, exemption.skill);
}

export interface ExemptionResult {
	/** Findings suppressed by an active exemption. */
	exempted: PolicyFinding[];
	/** Exemptions present in the policy whose expiry has passed. */
	expired: PolicyExemption[];
	/** Findings left in force after active exemptions were applied. */
	kept: PolicyFinding[];
}

/**
 * Partition findings into kept vs. exempted using active exemptions, and report
 * which configured exemptions have expired.
 *
 * @param fileToSkill maps a finding's `file` path to the skill's frontmatter
 *   name, so skill-scoped exemptions can be evaluated.
 */
export function applyExemptions(
	findings: PolicyFinding[],
	exemptions: PolicyExemption[] | undefined,
	fileToSkill: Map<string, string>,
	now: Date
): ExemptionResult {
	if (!exemptions || exemptions.length === 0) {
		return { kept: findings, exempted: [], expired: [] };
	}

	const active = exemptions.filter((e) => isExemptionActive(e, now));
	const expired = exemptions.filter((e) => !isExemptionActive(e, now) && e.expires);

	const kept: PolicyFinding[] = [];
	const exempted: PolicyFinding[] = [];

	for (const finding of findings) {
		const skillName = fileToSkill.get(finding.file);
		const isExempt = active.some((e) => exemptionMatches(e, finding, skillName));
		if (isExempt) {
			exempted.push(finding);
		} else {
			kept.push(finding);
		}
	}

	return { kept, exempted, expired };
}
