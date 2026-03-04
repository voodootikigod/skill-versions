import { describe, expect, it } from "vitest";
import type { PolicyReport } from "../types.js";
import { formatPolicyTerminal } from "./terminal.js";

function makeReport(overrides?: Partial<PolicyReport>): PolicyReport {
	return {
		policyFile: ".skill-policy.yml",
		files: 1,
		findings: [],
		required: [],
		summary: { blocked: 0, violations: 0, warnings: 0 },
		generatedAt: new Date().toISOString(),
		...overrides,
	};
}

describe("formatPolicyTerminal", () => {
	it("shows clean message when no findings", () => {
		const output = formatPolicyTerminal(makeReport());
		expect(output).toContain("comply with policy");
	});

	it("shows blocked findings", () => {
		const report = makeReport({
			findings: [
				{
					file: "skills/rogue/SKILL.md",
					severity: "blocked",
					rule: "sources.deny",
					message: 'Source "evil/skills" is in the deny list',
				},
			],
			summary: { blocked: 1, violations: 0, warnings: 0 },
		});
		const output = formatPolicyTerminal(report);
		expect(output).toContain("BLOCKED (1)");
		expect(output).toContain("deny list");
	});

	it("shows violation findings", () => {
		const report = makeReport({
			findings: [
				{
					file: "skills/test/SKILL.md",
					severity: "violation",
					rule: "content.deny_patterns",
					message: "Contains denied pattern",
					line: 23,
				},
			],
			summary: { blocked: 0, violations: 1, warnings: 0 },
		});
		const output = formatPolicyTerminal(report);
		expect(output).toContain("VIOLATIONS (1)");
		expect(output).toContain("line 23");
	});

	it("shows warning findings", () => {
		const report = makeReport({
			findings: [
				{
					file: "skills/old/SKILL.md",
					severity: "warning",
					rule: "freshness.max_age_days",
					message: "Last verified 142 days ago",
				},
			],
			summary: { blocked: 0, violations: 0, warnings: 1 },
		});
		const output = formatPolicyTerminal(report);
		expect(output).toContain("WARNINGS (1)");
		expect(output).toContain("142 days");
	});

	it("shows required skills status", () => {
		const report = makeReport({
			required: [
				{ skill: "coding-standards", satisfied: true },
				{ skill: "security-review", satisfied: false },
			],
		});
		const output = formatPolicyTerminal(report);
		expect(output).toContain("coding-standards");
		expect(output).toContain("installed");
		expect(output).toContain("MISSING");
	});

	it("shows summary with pass/fail", () => {
		const report = makeReport({
			findings: [
				{
					file: "test.md",
					severity: "blocked",
					rule: "test",
					message: "test",
				},
			],
			summary: { blocked: 1, violations: 2, warnings: 3 },
		});
		const output = formatPolicyTerminal(report);
		expect(output).toContain("1 blocked");
		expect(output).toContain("2 violation(s)");
		expect(output).toContain("3 warning(s)");
		expect(output).toContain("FAILED");
	});

	it("shows detail when present", () => {
		const report = makeReport({
			findings: [
				{
					file: "test.md",
					severity: "blocked",
					rule: "banned",
					message: "Skill is banned",
					detail: "Bypasses safety checks",
				},
			],
			summary: { blocked: 1, violations: 0, warnings: 0 },
		});
		const output = formatPolicyTerminal(report);
		expect(output).toContain("Bypasses safety checks");
	});
});
