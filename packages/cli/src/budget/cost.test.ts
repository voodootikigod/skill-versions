import { describe, expect, it } from "vitest";
import { estimateCost, getAvailableModels } from "./cost.js";

describe("estimateCost", () => {
	it("estimates cost for claude-sonnet (default)", () => {
		const result = estimateCost(10_000);
		expect(result.model).toBe("claude-sonnet");
		expect(result.tokens).toBe(10_000);
		// 10000 / 1_000_000 * 3.0 * 1000 = 30
		expect(result.costPer1KLoads).toBe(30);
	});

	it("estimates cost for claude-opus", () => {
		const result = estimateCost(10_000, "claude-opus");
		expect(result.model).toBe("claude-opus");
		// 10000 / 1_000_000 * 15.0 * 1000 = 150
		expect(result.costPer1KLoads).toBe(150);
	});

	it("estimates cost for claude-haiku", () => {
		const result = estimateCost(10_000, "claude-haiku");
		// 10000 / 1_000_000 * 0.25 * 1000 = 2.5
		expect(result.costPer1KLoads).toBe(2.5);
	});

	it("estimates cost for gpt-4o", () => {
		const result = estimateCost(10_000, "gpt-4o");
		// 10000 / 1_000_000 * 2.5 * 1000 = 25
		expect(result.costPer1KLoads).toBe(25);
	});

	it("returns 0 cost for 0 tokens", () => {
		const result = estimateCost(0);
		expect(result.costPer1KLoads).toBe(0);
	});

	it("supports custom call counts", () => {
		const result = estimateCost(10_000, "claude-sonnet", 500);
		// 10000 / 1_000_000 * 3.0 * 500 = 15
		expect(result.costPer1KLoads).toBe(15);
	});

	it("throws for unknown model", () => {
		expect(() => estimateCost(1000, "gpt-5-turbo")).toThrow("Unknown model");
	});
});

describe("getAvailableModels", () => {
	it("returns a list of model names", () => {
		const models = getAvailableModels();
		expect(models).toContain("claude-sonnet");
		expect(models).toContain("claude-opus");
		expect(models).toContain("claude-haiku");
		expect(models).toContain("gpt-4o");
	});
});
