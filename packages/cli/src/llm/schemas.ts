import { z } from "zod";

/**
 * Schema for the LLM's structured response when refreshing a skill file.
 */
export const RefreshResultSchema = z.object({
	updatedContent: z
		.string()
		.describe("The full updated SKILL.md content including frontmatter delimiters (---)"),
	summary: z.string().describe("A concise summary of what was changed and why"),
	changes: z
		.array(
			z.object({
				section: z.string().describe("The section or area of the skill file that was changed"),
				description: z.string().describe("What was changed in this section"),
			})
		)
		.describe("Breakdown of changes by section"),
	confidence: z
		.enum(["high", "medium", "low"])
		.describe(
			"Confidence level: high if changelog was clear, medium if inferred, low if no changelog available"
		),
	breakingChanges: z.boolean().describe("Whether the version update includes breaking changes"),
});

export type RefreshResultOutput = z.infer<typeof RefreshResultSchema>;
