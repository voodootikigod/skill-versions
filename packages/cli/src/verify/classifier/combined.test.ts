import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the LLM classifier
vi.mock("./llm.js", () => ({
	classifyWithLLM: vi.fn(),
}));

import type { ChangeSignal } from "../types.js";
import { combineClassification } from "./combined.js";
import { classifyWithLLM } from "./llm.js";

const mockClassifyWithLLM = vi.mocked(classifyWithLLM);

describe("combineClassification", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("uses heuristic result when confidence >= 0.8", async () => {
		const heuristicSignals: ChangeSignal[] = [
			{ type: "major", reason: "Package renamed", confidence: 0.9, source: "heuristic" },
		];

		const result = await combineClassification({
			heuristicSignals,
			beforeContent: "before",
			afterContent: "after",
		});

		expect(result.assessedBump).toBe("major");
		expect(result.llmUsed).toBe(false);
		expect(mockClassifyWithLLM).not.toHaveBeenCalled();
	});

	it("skips LLM when skipLlm is true", async () => {
		const heuristicSignals: ChangeSignal[] = [
			{ type: "patch", reason: "Low confidence", confidence: 0.5, source: "heuristic" },
		];

		const result = await combineClassification({
			heuristicSignals,
			beforeContent: "before",
			afterContent: "after",
			skipLlm: true,
		});

		expect(result.assessedBump).toBe("patch");
		expect(result.llmUsed).toBe(false);
		expect(mockClassifyWithLLM).not.toHaveBeenCalled();
	});

	it("consults LLM when heuristic confidence is low", async () => {
		const heuristicSignals: ChangeSignal[] = [
			{ type: "patch", reason: "Low confidence", confidence: 0.5, source: "heuristic" },
		];

		mockClassifyWithLLM.mockResolvedValue({
			type: "minor",
			reason: "New features added",
			confidence: 0.85,
			source: "llm",
		});

		const result = await combineClassification({
			heuristicSignals,
			beforeContent: "before",
			afterContent: "after",
		});

		expect(result.assessedBump).toBe("minor");
		expect(result.llmUsed).toBe(true);
		expect(result.signals).toHaveLength(2);
	});

	it("falls back to heuristic when LLM is unavailable", async () => {
		const heuristicSignals: ChangeSignal[] = [
			{ type: "minor", reason: "Some change", confidence: 0.6, source: "heuristic" },
		];

		mockClassifyWithLLM.mockResolvedValue(null);

		const result = await combineClassification({
			heuristicSignals,
			beforeContent: "before",
			afterContent: "after",
		});

		expect(result.assessedBump).toBe("minor");
		expect(result.llmUsed).toBe(false);
	});

	it("uses highest bump from all signals when both are uncertain", async () => {
		const heuristicSignals: ChangeSignal[] = [
			{ type: "patch", reason: "Small change", confidence: 0.5, source: "heuristic" },
		];

		mockClassifyWithLLM.mockResolvedValue({
			type: "minor",
			reason: "Uncertain assessment",
			confidence: 0.5,
			source: "llm",
		});

		const result = await combineClassification({
			heuristicSignals,
			beforeContent: "before",
			afterContent: "after",
		});

		expect(result.assessedBump).toBe("minor");
		expect(result.llmUsed).toBe(true);
	});
});
