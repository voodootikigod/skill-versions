import type { CostEstimate } from "./types.js";

/**
 * Pricing table: cost per million input tokens for common models.
 * Only input cost matters for skill loading (skills are read, not generated).
 */
const MODEL_PRICING: Record<string, number> = {
	"claude-opus": 15.0,
	"claude-sonnet": 3.0,
	"claude-haiku": 0.25,
	"gpt-4o": 2.5,
};

const DEFAULT_MODEL = "claude-sonnet";

/**
 * Get available model names for display/validation.
 */
export function getAvailableModels(): string[] {
	return Object.keys(MODEL_PRICING);
}

/**
 * Estimate the cost of loading skills based on token count and model pricing.
 *
 * @param tokens - Total input tokens
 * @param model - Model name from the pricing table (default: claude-sonnet)
 * @param calls - Number of skill loads to estimate for (default: 1000)
 * @returns CostEstimate with model, cost per `calls` loads, and token count
 */
export function estimateCost(tokens: number, model?: string, calls = 1000): CostEstimate {
	const selectedModel = model ?? DEFAULT_MODEL;
	const pricePerMillion = MODEL_PRICING[selectedModel];

	if (pricePerMillion === undefined) {
		throw new Error(
			`Unknown model: "${selectedModel}". Available models: ${Object.keys(MODEL_PRICING).join(", ")}`
		);
	}

	// cost = (tokens / 1_000_000) * pricePerMillion * calls
	const costPer1KLoads = (tokens / 1_000_000) * pricePerMillion * calls;

	return {
		model: selectedModel,
		costPer1KLoads: Math.round(costPer1KLoads * 1000) / 1000,
		tokens,
	};
}
