import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SkillTelemetryEvent } from "@skills-check/schema";

vi.mock("node:fs/promises", () => ({
	readFile: vi.fn(),
}));

import { readFile } from "node:fs/promises";
import { JSONLReader } from "./jsonl.js";

const mockReadFile = vi.mocked(readFile);

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

describe("JSONLReader", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("parses valid JSONL events", async () => {
		const events = [makeEvent(), makeEvent({ skill: { name: "vue", version: "3.5.0" } })];
		mockReadFile.mockResolvedValue(events.map((e) => JSON.stringify(e)).join("\n"));

		const reader = new JSONLReader("/path/to/events.jsonl");
		const result = await reader.read();
		expect(result).toHaveLength(2);
		expect(result[0].skill.name).toBe("react");
		expect(result[1].skill.name).toBe("vue");
	});

	it("skips blank lines", async () => {
		const event = makeEvent();
		mockReadFile.mockResolvedValue(`${JSON.stringify(event)}\n\n\n`);

		const reader = new JSONLReader("/path/to/events.jsonl");
		const result = await reader.read();
		expect(result).toHaveLength(1);
	});

	it("skips malformed JSON lines", async () => {
		const event = makeEvent();
		mockReadFile.mockResolvedValue(`${JSON.stringify(event)}\nnot-json\n{"bad":true}`);

		const reader = new JSONLReader("/path/to/events.jsonl");
		const result = await reader.read();
		expect(result).toHaveLength(1);
	});

	it("skips events with wrong schema_version", async () => {
		const event = { ...makeEvent(), schema_version: 2 };
		mockReadFile.mockResolvedValue(JSON.stringify(event));

		const reader = new JSONLReader("/path/to/events.jsonl");
		const result = await reader.read();
		expect(result).toHaveLength(0);
	});

	it("filters by since date", async () => {
		const old = makeEvent({ timestamp: "2026-01-01T00:00:00Z" });
		const recent = makeEvent({ timestamp: "2026-03-07T12:00:00Z" });
		mockReadFile.mockResolvedValue(`${JSON.stringify(old)}\n${JSON.stringify(recent)}`);

		const reader = new JSONLReader("/path/to/events.jsonl");
		const result = await reader.read({ since: new Date("2026-02-01T00:00:00Z") });
		expect(result).toHaveLength(1);
		expect(result[0].timestamp).toBe("2026-03-07T12:00:00Z");
	});

	it("filters by until date", async () => {
		const old = makeEvent({ timestamp: "2026-01-01T00:00:00Z" });
		const recent = makeEvent({ timestamp: "2026-03-07T12:00:00Z" });
		mockReadFile.mockResolvedValue(`${JSON.stringify(old)}\n${JSON.stringify(recent)}`);

		const reader = new JSONLReader("/path/to/events.jsonl");
		const result = await reader.read({ until: new Date("2026-02-01T00:00:00Z") });
		expect(result).toHaveLength(1);
		expect(result[0].timestamp).toBe("2026-01-01T00:00:00Z");
	});

	it("returns empty array for empty file", async () => {
		mockReadFile.mockResolvedValue("");

		const reader = new JSONLReader("/path/to/events.jsonl");
		const result = await reader.read();
		expect(result).toHaveLength(0);
	});
});
