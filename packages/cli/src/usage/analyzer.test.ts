import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SkillTelemetryEvent } from "@skills-check/schema";

vi.mock("../budget/cost.js", () => ({
	estimateCost: vi.fn((tokens: number) => ({
		model: "claude-sonnet",
		costPer1KLoads: tokens * 0.000003,
		tokens,
	})),
	getAvailableModels: vi.fn(() => ["claude-sonnet", "claude-opus", "gpt-4o"]),
}));

import { analyzeUsage } from "./analyzer.js";

function makeEvent(overrides?: Partial<SkillTelemetryEvent>): SkillTelemetryEvent {
	return {
		schema_version: 1,
		timestamp: "2026-03-07T12:00:00Z",
		detection: "watermark",
		confidence: 1.0,
		skill: { name: "react", version: "19.1.0" },
		request: { id: "req_123", model: "claude-sonnet-4-6", skill_tokens: 2847 },
		...overrides,
	};
}

describe("analyzeUsage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns empty report for no events", () => {
		const report = analyzeUsage([]);
		expect(report.totalCalls).toBe(0);
		expect(report.totalTokens).toBe(0);
		expect(report.skills).toHaveLength(0);
	});

	it("aggregates events by skill name", () => {
		const events = [
			makeEvent({ request: { id: "req_1", model: "claude-sonnet-4-6", skill_tokens: 1000 } }),
			makeEvent({ request: { id: "req_2", model: "claude-sonnet-4-6", skill_tokens: 2000 } }),
		];

		const report = analyzeUsage(events);
		expect(report.skills).toHaveLength(1);
		expect(report.skills[0].totalCalls).toBe(2);
		expect(report.skills[0].totalTokens).toBe(3000);
		expect(report.skills[0].avgTokensPerCall).toBe(1500);
	});

	it("deduplicates by request ID", () => {
		const events = [
			makeEvent({ detection: "watermark", confidence: 1.0 }),
			makeEvent({ detection: "content_hash", confidence: 0.7 }),
		];

		const report = analyzeUsage(events);
		expect(report.skills[0].totalCalls).toBe(1);
		// Should keep the higher confidence event (watermark)
	});

	it("detects version drift", () => {
		const events = [
			makeEvent({
				request: { id: "req_1", model: "m", skill_tokens: 100 },
				skill: { name: "react", version: "19.0.0" },
			}),
			makeEvent({
				request: { id: "req_2", model: "m", skill_tokens: 100 },
				skill: { name: "react", version: "19.1.0" },
			}),
		];

		const report = analyzeUsage(events);
		expect(report.skills[0].hasVersionDrift).toBe(true);
		expect(report.skills[0].versions).toEqual(["19.0.0", "19.1.0"]);
	});

	it("tracks model distribution", () => {
		const events = [
			makeEvent({ request: { id: "req_1", model: "claude-sonnet", skill_tokens: 100 } }),
			makeEvent({ request: { id: "req_2", model: "gpt-4o", skill_tokens: 100 } }),
			makeEvent({ request: { id: "req_3", model: "claude-sonnet", skill_tokens: 100 } }),
		];

		const report = analyzeUsage(events);
		expect(report.skills[0].models["claude-sonnet"]).toBe(2);
		expect(report.skills[0].models["gpt-4o"]).toBe(1);
	});

	it("sorts skills by totalCalls descending", () => {
		const events = [
			makeEvent({
				request: { id: "req_1", model: "m", skill_tokens: 100 },
				skill: { name: "vue", version: "3.5" },
			}),
			makeEvent({
				request: { id: "req_2", model: "m", skill_tokens: 100 },
				skill: { name: "react", version: "19.1.0" },
			}),
			makeEvent({
				request: { id: "req_3", model: "m", skill_tokens: 100 },
				skill: { name: "react", version: "19.1.0" },
			}),
		];

		const report = analyzeUsage(events);
		expect(report.skills[0].name).toBe("react");
		expect(report.skills[1].name).toBe("vue");
	});

	it("includes period in report", () => {
		const report = analyzeUsage([], { since: "2026-01-01", until: "2026-03-01" });
		expect(report.period.since).toBe("2026-01-01");
		expect(report.period.until).toBe("2026-03-01");
	});
});
