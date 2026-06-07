import { resolveField } from "../../lint/field-resolver.js";
import type { SkillFile } from "../../skill-io.js";
import type { SkillPolicy } from "../types.js";

/**
 * Check whether all required skills are present among discovered skill files.
 * Returns an array of { skill, satisfied } entries.
 */
export function checkRequired(
	discoveredSkills: SkillFile[],
	policy: SkillPolicy
): Array<{ skill: string; satisfied: boolean }> {
	if (!policy.required || policy.required.length === 0) {
		return [];
	}

	return policy.required.map((req) => {
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
		const satisfied = discoveredSkills.some((file) => {
			const name = file.frontmatter.name;
			if (typeof name !== "string") {
				return false;
			}
			if (name !== req.skill) {
				return false;
			}

			// If source is specified in the requirement, also match source
			if (req.source) {
				let fileSource: string | null = null;
				const sourceVal = resolveField(file.frontmatter, "source");
				const repoVal = resolveField(file.frontmatter, "repository");
				if (typeof sourceVal === "string") {
					fileSource = sourceVal;
				} else if (typeof repoVal === "string") {
					fileSource = repoVal;
				}
				if (fileSource !== req.source) {
					return false;
				}
			}

			return true;
		});

		return { skill: req.skill, satisfied };
	});
}
