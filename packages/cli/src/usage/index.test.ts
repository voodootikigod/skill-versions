import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SkillTelemetryEvent } from "@skills-check/schema";

vi.mock("./readers/index.js", () => ({
	createReader: vi.fn(),
}));

vi.mock("./analyzer.js", () => ({
	analyzeUsage: vi.fn(),
}));

vi.mock("./policy-check.js", () => ({
	checkUsagePolicy: vi.fn(),
}));

import { analyzeUsage } from "./analyzer.js";
import { runUsage } from "./index.js";
import { checkUsagePolicy } from "./policy-check.js";
import { createReader } from "./readers/index.js";

const mockCreateReader = vi.mocked(createReader);
const mockAnalyze = vi.mocked(analyzeUsage);
const mockPolicyCheck = vi.mocked(checkUsagePolicy);

function makeEvent(): SkillTelemetryEvent {
	return {
		schema_version: 1,
		timestamp: "2026-03-07T12:00:00Z",
		detection: "watermark",
		confidence: 1.0,
		skill: { name: "react", version: "19.1.0" },
		request: { id: "req_123", model: "claude-sonnet", skill_tokens: 2847 },
	};
}

describe("runUsage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPolicyCheck.mockResolvedValue([]);
	});

	it("reads events and produces report", async () => {
		const events = [makeEvent()];
		const mockReader = {
			read: vi.fn().mockResolvedValue(events),
			close: vi.fn(),
		};
		mockCreateReader.mockResolvedValue(mockReader);
		mockAnalyze.mockReturnValue({
			period: {},
			totalCalls: 1,
			totalTokens: 2847,
			totalEstimatedCost: 0.01,
			skills: [],
			generatedAt: "2026-03-07T12:00:00Z",
		});

		const result = await runUsage({ store: "file://./events.jsonl" });
		expect(result.report.totalCalls).toBe(1);
		expect(mockReader.close).toHaveBeenCalled();
	});

	it("passes date filters to reader", async () => {
		const mockReader = {
			read: vi.fn().mockResolvedValue([]),
			close: vi.fn(),
		};
		mockCreateReader.mockResolvedValue(mockReader);
		mockAnalyze.mockReturnValue({
			period: { since: "2026-01-01", until: "2026-03-01" },
			totalCalls: 0,
			totalTokens: 0,
			totalEstimatedCost: 0,
			skills: [],
			generatedAt: "2026-03-07T12:00:00Z",
		});

		await runUsage({ since: "2026-01-01", until: "2026-03-01" });
		expect(mockReader.read).toHaveBeenCalledWith(
			expect.objectContaining({
				since: expect.any(Date),
				until: expect.any(Date),
			}),
		);
	});

	it("checks policy when requested", async () => {
		const mockReader = {
			read: vi.fn().mockResolvedValue([]),
			close: vi.fn(),
		};
		mockCreateReader.mockResolvedValue(mockReader);
		mockAnalyze.mockReturnValue({
			period: {},
			totalCalls: 0,
			totalTokens: 0,
			totalEstimatedCost: 0,
			skills: [],
			generatedAt: "2026-03-07T12:00:00Z",
		});

		await runUsage({ checkPolicy: true });
		expect(mockPolicyCheck).toHaveBeenCalled();
	});

	it("skips policy check by default", async () => {
		const mockReader = {
			read: vi.fn().mockResolvedValue([]),
			close: vi.fn(),
		};
		mockCreateReader.mockResolvedValue(mockReader);
		mockAnalyze.mockReturnValue({
			period: {},
			totalCalls: 0,
			totalTokens: 0,
			totalEstimatedCost: 0,
			skills: [],
			generatedAt: "2026-03-07T12:00:00Z",
		});

		await runUsage({});
		expect(mockPolicyCheck).not.toHaveBeenCalled();
	});

	it("closes reader even on error", async () => {
		const mockReader = {
			read: vi.fn().mockRejectedValue(new Error("read failed")),
			close: vi.fn(),
		};
		mockCreateReader.mockResolvedValue(mockReader);

		await expect(runUsage({})).rejects.toThrow("read failed");
		expect(mockReader.close).toHaveBeenCalled();
	});
});
