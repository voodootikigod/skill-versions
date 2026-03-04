import type { SkillFile } from "../../skill-io.js";
import { detectsAgentSpecific } from "../detection/agent-specific.js";
import { detectsProduct } from "../detection/product-refs.js";
import type { LintFinding } from "../types.js";

/**
 * Check conditionally required frontmatter fields.
 *
 * These fields are required only when the skill content indicates they are relevant:
 * - product-version: required if the skill references a specific product
 * - agents: required if the skill contains agent-specific instructions
 */
export function checkConditional(file: SkillFile): LintFinding[] {
	const findings: LintFinding[] = [];
	const fm = file.frontmatter;

	// product-version: required if content references a product
	if (!fm["product-version"] && detectsProduct(file.content)) {
		findings.push({
			file: file.path,
			field: "product-version",
			level: "warning",
			message: "Skill references a product but is missing 'product-version' in frontmatter",
			fixable: false,
		});
	}

	// agents: required if content has agent-specific instructions
	if (!fm.agents && detectsAgentSpecific(file.content)) {
		findings.push({
			file: file.path,
			field: "agents",
			level: "warning",
			message: "Skill contains agent-specific instructions but is missing 'agents' in frontmatter",
			fixable: false,
		});
	}

	return findings;
}
