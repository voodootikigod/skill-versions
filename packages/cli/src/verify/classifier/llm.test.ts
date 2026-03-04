import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the LLM providers and AI SDK
vi.mock("../../llm/providers.js", () => ({
	resolveModel: vi.fn(),
}));

vi.mock("ai", () => ({
	generateObject: vi.fn(),
}));

import { generateObject } from "ai";
import { resolveModel } from "../../llm/providers.js";
import { classifyWithLLM } from "./llm.js";

const mockResolveModel = vi.mocked(resolveModel);
const mockGenerateObject = vi.mocked(generateObject);

describe("classifyWithLLM", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns classification when LLM is available", async () => {
		mockResolveModel.mockResolvedValue(
			{} as ReturnType<typeof resolveModel> extends Promise<infer T> ? T : never,
		);
		mockGenerateObject.mockResolvedValue({
			object: {
				classification: "minor",
				reasoning: "New sections added",
				confidence: 0.85,
			},
		} as Awaited<ReturnType<typeof generateObject>>);

		const result = await classifyWithLLM("before content", "after content");

		expect(result).not.toBeNull();
		expect(result?.type).toBe("minor");
		expect(result?.confidence).toBe(0.85);
		expect(result?.source).toBe("llm");
	});

	it("returns null when no API key is available", async () => {
		mockResolveModel.mockRejectedValue(new Error("No LLM provider detected"));

		const result = await classifyWithLLM("before", "after");
		expect(result).toBeNull();
	});

	it("returns null when generateObject fails", async () => {
		mockResolveModel.mockResolvedValue(
			{} as ReturnType<typeof resolveModel> extends Promise<infer T> ? T : never,
		);
		mockGenerateObject.mockRejectedValue(new Error("API error"));

		const result = await classifyWithLLM("before", "after");
		expect(result).toBeNull();
	});

	it("passes provider and model flags through", async () => {
		mockResolveModel.mockResolvedValue(
			{} as ReturnType<typeof resolveModel> extends Promise<infer T> ? T : never,
		);
		mockGenerateObject.mockResolvedValue({
			object: {
				classification: "patch",
				reasoning: "Minor fix",
				confidence: 0.9,
			},
		} as Awaited<ReturnType<typeof generateObject>>);

		await classifyWithLLM("before", "after", "openai", "gpt-4o");

		expect(mockResolveModel).toHaveBeenCalledWith("openai", "gpt-4o");
	});
});
