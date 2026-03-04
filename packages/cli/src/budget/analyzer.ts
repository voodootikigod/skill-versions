import type { SkillSection } from "../shared/sections.js";
import type { SkillFile } from "../skill-io.js";
import { countTokens } from "./tokenizer.js";
import type { SectionBudget, SkillBudget } from "./types.js";

/**
 * Derive a human-readable name for the skill, falling back through
 * frontmatter `name`, then the parent directory name.
 */
function skillName(file: SkillFile): string {
	if (typeof file.frontmatter.name === "string" && file.frontmatter.name.length > 0) {
		return file.frontmatter.name;
	}
	// Use the parent directory name as a fallback
	const parts = file.path.replace(/\\/g, "/").split("/");
	const mdIndex = parts.lastIndexOf("SKILL.md");
	if (mdIndex > 0) {
		return parts[mdIndex - 1];
	}
	return parts.at(-1) as string;
}

/**
 * Analyze a single skill file and compute per-section token budgets.
 */
export function analyzeSkill(file: SkillFile, sections: SkillSection[]): SkillBudget {
	const totalTokens = countTokens(file.raw);

	const sectionBudgets: SectionBudget[] = sections.map((section) => {
		// Count tokens for the full section text including the heading line
		const fullText =
			section.level > 0
				? `${"#".repeat(section.level)} ${section.heading}\n${section.content}`
				: section.content;
		const tokens = countTokens(fullText);
		const percentage = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0;

		return {
			heading: section.heading || "(preamble)",
			tokens,
			percentage: Math.round(percentage * 10) / 10,
		};
	});

	return {
		path: file.path,
		name: skillName(file),
		totalTokens,
		sections: sectionBudgets,
	};
}
