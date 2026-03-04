import { describe, expect, it } from "vitest";
import type { LintReport } from "../types.js";
import { formatLintTerminal } from "./terminal.js";

function makeReport(overrides?: Partial<LintReport>): LintReport {
	return {
		files: 1,
		findings: [],
		errors: 0,
		warnings: 0,
		infos: 0,
		fixed: 0,
		generatedAt: "2026-03-03T00:00:00.000Z",
		...overrides,
	};
}

describe("formatLintTerminal", () => {
	it("shows clean message when no findings", () => {
		const output = formatLintTerminal(makeReport());
		expect(output).toContain("No findings");
		expect(output).toContain("1 file(s) scanned");
	});

	it("shows findings grouped by file", () => {
		const output = formatLintTerminal(
			makeReport({
				findings: [
					{
						file: "skills/test/SKILL.md",
						field: "name",
						level: "error",
						message: "Missing required field: name",
						fixable: false,
					},
					{
						file: "skills/test/SKILL.md",
						field: "keywords",
						level: "info",
						message: "Missing recommended field: keywords",
						fixable: false,
					},
				],
				errors: 1,
				infos: 1,
			})
		);
		expect(output).toContain("skills/test/SKILL.md");
		expect(output).toContain("name");
		expect(output).toContain("keywords");
		expect(output).toContain("Errors");
		expect(output).toContain("Info");
	});

	it("shows fixable tag for fixable findings", () => {
		const output = formatLintTerminal(
			makeReport({
				findings: [
					{
						file: "test/SKILL.md",
						field: "author",
						level: "error",
						message: "Missing author",
						fixable: true,
					},
				],
				errors: 1,
			})
		);
		expect(output).toContain("[fixable]");
	});

	it("shows summary with counts", () => {
		const output = formatLintTerminal(
			makeReport({
				findings: [
					{
						file: "test/SKILL.md",
						field: "name",
						level: "error",
						message: "Missing name",
						fixable: false,
					},
				],
				errors: 1,
				warnings: 0,
				infos: 0,
			})
		);
		expect(output).toContain("Summary");
		expect(output).toContain("Errors");
		expect(output).toContain("Total");
	});

	it("shows fixed count when fixes were applied", () => {
		const output = formatLintTerminal(
			makeReport({
				fixed: 2,
			})
		);
		expect(output).toContain("Fixed");
		expect(output).toContain("2");
	});

	it("includes skillsafe lint header", () => {
		const output = formatLintTerminal(makeReport());
		expect(output).toContain("skillsafe lint");
	});
});
