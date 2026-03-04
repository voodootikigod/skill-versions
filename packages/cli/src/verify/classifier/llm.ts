import type { ChangeSignal } from "../types.js";

/**
 * Attempt to classify a version bump using an LLM.
 * Returns null if no LLM provider is available.
 * Gracefully degrades — never throws for missing API keys.
 */
export async function classifyWithLLM(
	before: string,
	after: string,
	providerFlag?: string,
	modelFlag?: string,
): Promise<ChangeSignal | null> {
	try {
		// Dynamic imports to avoid module-level evaluation issues
		const { resolveModel } = await import("../../llm/providers.js");
		const { generateObject } = await import("ai");
		const { z } = await import("zod");

		const model = await resolveModel(providerFlag, modelFlag);

		const VerifySchema = z.object({
			classification: z.enum(["major", "minor", "patch"]),
			reasoning: z.string(),
			confidence: z.number().min(0).max(1),
		});

		const systemPrompt = `You are an expert at classifying changes to AI agent skill files (SKILL.md).

Classify the change between two versions as:
- MAJOR: Core APIs renamed/removed, primary workflow changed, package names changed, sections removed that change agent behavior
- MINOR: New features/APIs added, new sections documented, scope expanded without invalidating existing content
- PATCH: Typo fixes, version number updates in examples, URL updates, minor rewording without changing approach

Return a JSON object with classification, reasoning, and confidence (0.0 to 1.0).`;

		// Truncate content if too large (keep under ~8000 tokens ~ 32000 chars)
		const maxChars = 16000;
		const beforeTruncated =
			before.length > maxChars ? `${before.slice(0, maxChars)}\n... (truncated)` : before;
		const afterTruncated =
			after.length > maxChars ? `${after.slice(0, maxChars)}\n... (truncated)` : after;

		const userPrompt = `Compare these two versions of an agent skill file and classify the change:

## BEFORE
${beforeTruncated}

## AFTER
${afterTruncated}

Classify the magnitude of change.`;

		const { object: result } = await generateObject({
			model,
			schema: VerifySchema,
			system: systemPrompt,
			prompt: userPrompt,
		});

		return {
			type: result.classification,
			reason: result.reasoning,
			confidence: result.confidence,
			source: "llm",
		};
	} catch {
		// No LLM provider available, or LLM call failed — gracefully degrade
		return null;
	}
}
