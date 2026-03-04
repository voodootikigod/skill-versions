import { describe, expect, it } from "vitest";
import type { AuditReport } from "../types.js";
import { formatJson } from "./json.js";

describe("formatJson", () => {
	it("produces valid JSON", () => {
		const report: AuditReport = {
			files: 1,
			findings: [],
			summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
			generatedAt: "2026-03-03T00:00:00.000Z",
		};
		const output = formatJson(report);
		expect(() => JSON.parse(output)).not.toThrow();
	});

	it("pretty-prints with 2 spaces", () => {
		const report: AuditReport = {
			files: 1,
			findings: [],
			summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
			generatedAt: "2026-03-03T00:00:00.000Z",
		};
		const output = formatJson(report);
		expect(output).toBe(JSON.stringify(report, null, 2));
	});

	it("includes all findings", () => {
		const report: AuditReport = {
			files: 1,
			findings: [
				{
					file: "test.md",
					line: 10,
					severity: "critical",
					category: "hallucinated-package",
					message: "Not found",
					evidence: "bad-pkg",
				},
			],
			summary: { critical: 1, high: 0, medium: 0, low: 0, total: 1 },
			generatedAt: "2026-03-03T00:00:00.000Z",
		};
		const output = formatJson(report);
		const parsed = JSON.parse(output);
		expect(parsed.findings).toHaveLength(1);
		expect(parsed.findings[0].severity).toBe("critical");
		expect(parsed.summary.critical).toBe(1);
	});
});
