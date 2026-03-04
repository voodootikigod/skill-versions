import { describe, expect, it } from "vitest";
import type { LintReport } from "../types.js";
import { formatLintJson } from "./json.js";

describe("formatLintJson", () => {
	it("returns valid JSON string", () => {
		const report: LintReport = {
			files: 2,
			findings: [
				{
					file: "test/SKILL.md",
					field: "name",
					level: "error",
					message: "Missing required field: name",
					fixable: false,
				},
			],
			errors: 1,
			warnings: 0,
			infos: 0,
			fixed: 0,
			generatedAt: "2026-03-03T00:00:00.000Z",
		};
		const output = formatLintJson(report);
		const parsed = JSON.parse(output);
		expect(parsed.files).toBe(2);
		expect(parsed.findings).toHaveLength(1);
		expect(parsed.errors).toBe(1);
	});

	it("returns pretty-printed JSON", () => {
		const report: LintReport = {
			files: 0,
			findings: [],
			errors: 0,
			warnings: 0,
			infos: 0,
			fixed: 0,
			generatedAt: "2026-03-03T00:00:00.000Z",
		};
		const output = formatLintJson(report);
		expect(output).toContain("\n");
		expect(output).toContain("  ");
	});
});
