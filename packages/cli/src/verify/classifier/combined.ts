import type { ChangeSignal, VersionBump } from "../types.js";
import { highestBump } from "./heuristics.js";
import { classifyWithLLM } from "./llm.js";

interface CombinedInput {
	heuristicSignals: ChangeSignal[];
	beforeContent: string;
	afterContent: string;
	skipLlm?: boolean;
	providerFlag?: string;
	modelFlag?: string;
}

interface CombinedResult {
	assessedBump: VersionBump;
	signals: ChangeSignal[];
	llmUsed: boolean;
}

/**
 * Combine heuristic and (optionally) LLM classification results.
 *
 * Strategy:
 * 1. If heuristic signals have high confidence (>= 0.8), use them directly
 * 2. If uncertain (< 0.8) and LLM is available, consult the LLM
 * 3. If LLM agrees with heuristics, boost confidence
 * 4. If LLM disagrees, weight LLM result but keep both signals
 */
export async function combineClassification(input: CombinedInput): Promise<CombinedResult> {
	const { heuristicSignals, beforeContent, afterContent, skipLlm, providerFlag, modelFlag } = input;

	const allSignals = [...heuristicSignals];
	const heuristicResult = highestBump(heuristicSignals);

	// If heuristic is confident enough, use it directly
	if (heuristicResult.confidence >= 0.8 || skipLlm) {
		return {
			assessedBump: heuristicResult.bump,
			signals: allSignals,
			llmUsed: false,
		};
	}

	// Try LLM classification
	const llmSignal = await classifyWithLLM(beforeContent, afterContent, providerFlag, modelFlag);

	if (!llmSignal) {
		// LLM unavailable, use heuristic result as-is
		return {
			assessedBump: heuristicResult.bump,
			signals: allSignals,
			llmUsed: false,
		};
	}

	allSignals.push(llmSignal);

	// Combine: use the LLM result since heuristics were uncertain
	if (llmSignal.confidence >= 0.7) {
		return {
			assessedBump: llmSignal.type,
			signals: allSignals,
			llmUsed: true,
		};
	}

	// Both uncertain — use the highest bump from all signals
	const combined = highestBump(allSignals);
	return {
		assessedBump: combined.bump,
		signals: allSignals,
		llmUsed: true,
	};
}
