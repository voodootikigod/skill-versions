import { describe, expect, it } from "vitest";
import type { VerifyReport } from "../types.js";
import { formatVerifyTerminal } from "./terminal.js";

function makeReport(overrides?: Partial<VerifyReport>): VerifyReport {
	return {
		results: [],
		summary: { passed: 0, failed: 0, skipped: 0 },
		generatedAt: "2026-03-03T00:00:00.000Z",
		...overrides,
	};
}

describe("formatVerifyTerminal", () => {
	it("shows empty message when no results", () => {
		const output = formatVerifyTerminal(makeReport());
		expect(output).toContain("No skills found to verify");
	});

	it("shows pass status for matching results", () => {
		const output = formatVerifyTerminal(
			makeReport({
				results: [
					{
						skill: "test-skill",
						file: "test.md",
						declaredBefore: "1.0.0",
						declaredAfter: "1.1.0",
						declaredBump: "minor",
						assessedBump: "minor",
						match: true,
						signals: [
							{
								type: "minor",
								reason: "New section added",
								confidence: 0.8,
								source: "heuristic",
							},
						],
						explanation: "The minor bump is appropriate.",
						llmUsed: false,
					},
				],
				summary: { passed: 1, failed: 0, skipped: 0 },
			})
		);

		expect(output).toContain("test-skill");
		expect(output).toContain("PASS");
		expect(output).toContain("New section added");
		expect(output).toContain("Passed");
	});

	it("shows fail status for mismatched results", () => {
		const output = formatVerifyTerminal(
			makeReport({
				results: [
					{
						skill: "deploy-helper",
						file: "deploy.md",
						declaredBefore: "2.0.0",
						declaredAfter: "2.0.1",
						declaredBump: "patch",
						assessedBump: "major",
						match: false,
						signals: [
							{
								type: "major",
								reason: "Package renamed",
								confidence: 0.9,
								source: "heuristic",
							},
						],
						explanation: "Patch bump appears insufficient.",
						llmUsed: false,
					},
				],
				summary: { passed: 0, failed: 1, skipped: 0 },
			})
		);

		expect(output).toContain("deploy-helper");
		expect(output).toContain("FAIL");
		expect(output).toContain("Failed");
	});

	it("shows LLM indicator when LLM was used", () => {
		const output = formatVerifyTerminal(
			makeReport({
				results: [
					{
						skill: "ai-skill",
						file: "ai.md",
						declaredBefore: "1.0.0",
						declaredAfter: "1.1.0",
						declaredBump: "minor",
						assessedBump: "minor",
						match: true,
						signals: [
							{
								type: "minor",
								reason: "LLM detected new features",
								confidence: 0.85,
								source: "llm",
							},
						],
						explanation: "Minor bump is appropriate.",
						llmUsed: true,
					},
				],
				summary: { passed: 1, failed: 0, skipped: 0 },
			})
		);

		expect(output).toContain("LLM-assisted");
	});

	it("shows summary counts", () => {
		const output = formatVerifyTerminal(
			makeReport({
				results: [
					{
						skill: "a",
						file: "a.md",
						declaredBefore: "1.0.0",
						declaredAfter: "1.0.1",
						declaredBump: "patch",
						assessedBump: "patch",
						match: true,
						signals: [],
						explanation: "",
						llmUsed: false,
					},
				],
				summary: { passed: 2, failed: 1, skipped: 1 },
			})
		);

		expect(output).toContain("2");
		expect(output).toContain("1");
	});
});
