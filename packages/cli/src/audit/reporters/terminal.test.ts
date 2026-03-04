import { describe, expect, it } from "vitest";
import type { AuditReport } from "../types.js";
import { formatTerminal } from "./terminal.js";

function makeReport(overrides?: Partial<AuditReport>): AuditReport {
	return {
		files: 2,
		findings: [],
		summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
		generatedAt: "2026-03-03T00:00:00.000Z",
		...overrides,
	};
}

describe("formatTerminal", () => {
	it("shows clean message when no findings", () => {
		const output = formatTerminal(makeReport());
		expect(output).toContain("No findings");
	});

	it("includes header", () => {
		const output = formatTerminal(makeReport());
		expect(output).toContain("skills-check audit");
	});

	it("groups findings by file", () => {
		const report = makeReport({
			findings: [
				{
					file: "a/SKILL.md",
					line: 1,
					severity: "high",
					category: "dangerous-command",
					message: "Bad command",
					evidence: "rm -rf /",
				},
				{
					file: "b/SKILL.md",
					line: 5,
					severity: "medium",
					category: "metadata-incomplete",
					message: "Missing field",
					evidence: "name is missing",
				},
			],
			summary: { critical: 0, high: 1, medium: 1, low: 0, total: 2 },
		});

		const output = formatTerminal(report);
		expect(output).toContain("a/SKILL.md");
		expect(output).toContain("b/SKILL.md");
		expect(output).toContain("Bad command");
		expect(output).toContain("Missing field");
	});

	it("shows summary counts", () => {
		const report = makeReport({
			findings: [
				{
					file: "test.md",
					line: 1,
					severity: "critical",
					category: "hallucinated-package",
					message: "Not found",
					evidence: "bad-pkg",
				},
			],
			summary: { critical: 1, high: 0, medium: 0, low: 0, total: 1 },
		});

		const output = formatTerminal(report);
		expect(output).toContain("Critical: 1");
		expect(output).toContain("Total:    1");
	});

	it("shows file count", () => {
		const output = formatTerminal(makeReport({ files: 5 }));
		expect(output).toContain("5 file(s) scanned");
	});

	it("shows tip footer when injection/command findings present without registry audits", () => {
		const report = makeReport({
			findings: [
				{
					file: "test.md",
					line: 1,
					severity: "medium",
					category: "prompt-injection",
					message: "Override detected",
					evidence: "ignore previous",
				},
			],
			summary: { critical: 0, high: 0, medium: 1, low: 0, total: 1 },
		});

		const output = formatTerminal(report);
		expect(output).toContain("--include-registry-audits");
	});

	it("does not show tip footer when registry audits are present", () => {
		const report = makeReport({
			findings: [
				{
					file: "test.md",
					line: 1,
					severity: "medium",
					category: "prompt-injection",
					message: "Override detected",
					evidence: "ignore previous",
				},
			],
			summary: { critical: 0, high: 0, medium: 1, low: 0, total: 1 },
			registryAudits: [
				{
					skillName: "test",
					file: "test.md",
					entries: [{ auditor: "snyk", status: "safe" }],
				},
			],
		});

		const output = formatTerminal(report);
		expect(output).not.toContain("--include-registry-audits");
	});

	it("shows skills.sh security section when registry audits are present", () => {
		const report = makeReport({
			findings: [
				{
					file: "test.md",
					line: 1,
					severity: "medium",
					category: "metadata-incomplete",
					message: "Missing field",
					evidence: "",
				},
			],
			summary: { critical: 0, high: 0, medium: 1, low: 0, total: 1 },
			registryAudits: [
				{
					skillName: "test",
					file: "test.md",
					entries: [
						{ auditor: "snyk", status: "safe", riskLevel: "none" },
						{ auditor: "socket", status: "alert", riskLevel: "medium" },
					],
				},
			],
		});

		const output = formatTerminal(report);
		expect(output).toContain("skills.sh security:");
		expect(output).toContain("snyk");
		expect(output).toContain("socket");
	});
});
