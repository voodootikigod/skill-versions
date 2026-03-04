import type { CostEstimate, TestOptions, TestSuite } from "./types.js";

/**
 * Pricing per 1M input tokens for common models.
 * Used for rough cost estimation only.
 */
const MODEL_PRICING: Record<string, number> = {
	"claude-sonnet": 3.0,
	"claude-haiku": 0.8,
	"claude-opus": 15.0,
	"gpt-4o": 2.5,
	"gpt-4o-mini": 0.15,
	"gemini-flash": 0.075,
	"gemini-pro": 1.25,
};

/** Average prompt size in tokens (rough estimate). */
const AVG_PROMPT_TOKENS = 500;

/** Average rubric evaluation in tokens (rough estimate). */
const AVG_RUBRIC_TOKENS = 2000;

/**
 * Estimate the cost of running test suites.
 * Trigger tests are near-zero cost. Outcome/style/regression tests involve
 * real agent execution. LLM-rubric graders add per-evaluation cost.
 */
export function estimateTestCost(suites: TestSuite[], options: TestOptions): CostEstimate {
	const perSuite: CostEstimate["perSuite"] = [];
	let totalEstimatedCost = 0;

	const trialsOverride = options.trials;
	const pricePerMTok = MODEL_PRICING[options.model ?? "claude-sonnet"] ?? 3.0;

	for (const suite of suites) {
		const trials = trialsOverride ?? suite.trials;
		let suiteCost = 0;

		for (const testCase of suite.cases) {
			if (testCase.type === "trigger") {
				// Trigger tests are classification only — near-zero cost
				suiteCost += (AVG_PROMPT_TOKENS / 1_000_000) * pricePerMTok * trials * 0.1;
				continue;
			}

			// Outcome/style/regression: agent execution cost per trial
			suiteCost += (AVG_PROMPT_TOKENS / 1_000_000) * pricePerMTok * trials;

			// LLM-rubric graders add evaluation cost per trial
			for (const grader of testCase.graders) {
				if (grader.type === "llm-rubric") {
					suiteCost += (AVG_RUBRIC_TOKENS / 1_000_000) * pricePerMTok * trials;
				}
			}
		}

		perSuite.push({
			suiteName: suite.name,
			estimatedCost: Math.round(suiteCost * 10_000) / 10_000,
			caseCount: suite.cases.length,
			trials,
		});

		totalEstimatedCost += suiteCost;
	}

	return {
		totalEstimatedCost: Math.round(totalEstimatedCost * 10_000) / 10_000,
		perSuite,
	};
}
