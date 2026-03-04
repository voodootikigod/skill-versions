import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SkillPolicy } from "../types.js";

// Mock the audit module
vi.mock("../../audit/index.js", () => ({
	runAudit: vi.fn(),
}));

import { runAudit } from "../../audit/index.js";
import { checkAuditClean } from "./audit-integration.js";

const mockedRunAudit = vi.mocked(runAudit);

describe("checkAuditClean", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns no findings when audit not required", async () => {
		const findings = await checkAuditClean(["."], { version: 1 });
		expect(findings).toEqual([]);
	});

	it("returns no findings when audit is clean", async () => {
		mockedRunAudit.mockResolvedValue({
			files: 1,
			findings: [],
			summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
			generatedAt: new Date().toISOString(),
		});

		const policy: SkillPolicy = {
			version: 1,
			audit: { require_clean: true },
		};
		const findings = await checkAuditClean(["."], policy);
		expect(findings).toEqual([]);
	});

	it("converts audit findings above threshold to policy violations", async () => {
		mockedRunAudit.mockResolvedValue({
			files: 1,
			findings: [
				{
					file: "test.md",
					line: 10,
					severity: "critical",
					category: "hallucinated-package",
					message: "Package not found",
					evidence: "npm install phantom-pkg",
				},
				{
					file: "test.md",
					line: 20,
					severity: "low",
					category: "metadata-incomplete",
					message: "Missing author",
					evidence: "",
				},
			],
			summary: { critical: 1, high: 0, medium: 0, low: 1, total: 2 },
			generatedAt: new Date().toISOString(),
		});

		const policy: SkillPolicy = {
			version: 1,
			audit: { require_clean: true, min_severity_to_block: "high" },
		};
		const findings = await checkAuditClean(["."], policy);

		// Only the critical finding should be converted (it meets the "high" threshold)
		expect(findings).toHaveLength(1);
		expect(findings[0].severity).toBe("violation");
		expect(findings[0].message).toContain("Package not found");
	});

	it("uses default threshold of high when not specified", async () => {
		mockedRunAudit.mockResolvedValue({
			files: 1,
			findings: [
				{
					file: "test.md",
					line: 5,
					severity: "medium",
					category: "dangerous-command",
					message: "Dangerous command",
					evidence: "rm -rf /",
				},
			],
			summary: { critical: 0, high: 0, medium: 1, low: 0, total: 1 },
			generatedAt: new Date().toISOString(),
		});

		const policy: SkillPolicy = {
			version: 1,
			audit: { require_clean: true },
		};
		const findings = await checkAuditClean(["."], policy);

		// Medium doesn't meet default "high" threshold
		expect(findings).toEqual([]);
	});

	it("returns warning when audit throws", async () => {
		mockedRunAudit.mockRejectedValue(new Error("Network error"));

		const policy: SkillPolicy = {
			version: 1,
			audit: { require_clean: true },
		};
		const findings = await checkAuditClean(["."], policy);
		expect(findings).toHaveLength(1);
		expect(findings[0].severity).toBe("warning");
		expect(findings[0].message).toContain("failed to run");
	});
});
