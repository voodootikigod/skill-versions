import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditReport } from "../audit/types.js";

// Mock runAudit to avoid filesystem/network
vi.mock("../audit/index.js", () => ({
	runAudit: vi.fn(),
}));

import { runAudit } from "../audit/index.js";
import { auditCommand } from "./audit.js";

const mockedRunAudit = vi.mocked(runAudit);

function makeReport(overrides?: Partial<AuditReport>): AuditReport {
	return {
		files: 1,
		findings: [],
		summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
		generatedAt: "2026-03-03T00:00:00.000Z",
		...overrides,
	};
}

describe("auditCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedRunAudit.mockResolvedValue(makeReport());
		vi.spyOn(console, "log").mockImplementation(() => {
			/* intentionally empty */
		});
		vi.spyOn(console, "error").mockImplementation(() => {
			/* intentionally empty */
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns 0 for clean report", async () => {
		const code = await auditCommand(".", {});
		expect(code).toBe(0);
	});

	it("returns 1 when findings meet threshold", async () => {
		mockedRunAudit.mockResolvedValue(
			makeReport({
				findings: [
					{
						file: "test.md",
						line: 1,
						severity: "critical",
						category: "hallucinated-package",
						message: "not found",
						evidence: "npm install bad",
					},
				],
				summary: { critical: 1, high: 0, medium: 0, low: 0, total: 1 },
			})
		);

		const code = await auditCommand(".", {});
		expect(code).toBe(1);
	});

	it("returns 0 when findings are below threshold", async () => {
		mockedRunAudit.mockResolvedValue(
			makeReport({
				findings: [
					{
						file: "test.md",
						line: 1,
						severity: "low",
						category: "metadata-incomplete",
						message: "missing author",
						evidence: "",
					},
				],
				summary: { critical: 0, high: 0, medium: 0, low: 1, total: 1 },
			})
		);

		// Default threshold is "high", so low findings should not trigger exit 1
		const code = await auditCommand(".", {});
		expect(code).toBe(0);
	});

	it("returns 2 for invalid --fail-on value", async () => {
		const code = await auditCommand(".", { failOn: "banana" });
		expect(code).toBe(2);
	});

	it("returns 2 when --verbose and --quiet are both set", async () => {
		const code = await auditCommand(".", { verbose: true, quiet: true });
		expect(code).toBe(2);
	});

	it("respects --fail-on threshold", async () => {
		mockedRunAudit.mockResolvedValue(
			makeReport({
				findings: [
					{
						file: "test.md",
						line: 1,
						severity: "medium",
						category: "metadata-incomplete",
						message: "missing description",
						evidence: "",
					},
				],
				summary: { critical: 0, high: 0, medium: 1, low: 0, total: 1 },
			})
		);

		// With threshold at "medium", medium findings trigger exit 1
		const code = await auditCommand(".", { failOn: "medium" });
		expect(code).toBe(1);
	});

	it("passes skipUrls option to runAudit", async () => {
		await auditCommand(".", { skipUrls: true });
		expect(mockedRunAudit).toHaveBeenCalledWith(["."], expect.objectContaining({ skipUrls: true }));
	});

	it("passes packagesOnly option to runAudit", async () => {
		await auditCommand(".", { packagesOnly: true });
		expect(mockedRunAudit).toHaveBeenCalledWith(
			["."],
			expect.objectContaining({ packagesOnly: true })
		);
	});

	it("passes ignorePath option to runAudit", async () => {
		await auditCommand(".", { ignore: ".myignore" });
		expect(mockedRunAudit).toHaveBeenCalledWith(
			["."],
			expect.objectContaining({ ignorePath: ".myignore" })
		);
	});

	it("passes uniqueOnly option to runAudit", async () => {
		await auditCommand(".", { uniqueOnly: true });
		expect(mockedRunAudit).toHaveBeenCalledWith(
			["."],
			expect.objectContaining({ uniqueOnly: true })
		);
	});

	it("passes includeRegistryAudits option to runAudit", async () => {
		await auditCommand(".", { includeRegistryAudits: true });
		expect(mockedRunAudit).toHaveBeenCalledWith(
			["."],
			expect.objectContaining({ includeRegistryAudits: true })
		);
	});

	it("writes report to file with --output", async () => {
		const outPath = join(tmpdir(), `audit-test-${Date.now()}.json`);
		await auditCommand(".", { format: "json", output: outPath });

		const content = await readFile(outPath, "utf-8");
		const parsed = JSON.parse(content);
		expect(parsed.files).toBe(1);
		expect(parsed.findings).toEqual([]);

		// Cleanup
		const { rm } = await import("node:fs/promises");
		await rm(outPath, { force: true });
	});

	it("outputs json format", async () => {
		const logSpy = vi.mocked(console.log);
		await auditCommand(".", { format: "json" });
		expect(logSpy).toHaveBeenCalled();
		const output = logSpy.mock.calls[0][0] as string;
		const parsed = JSON.parse(output);
		expect(parsed.files).toBe(1);
	});

	it("outputs markdown format", async () => {
		const logSpy = vi.mocked(console.log);
		await auditCommand(".", { format: "markdown" });
		expect(logSpy).toHaveBeenCalled();
		const output = logSpy.mock.calls[0][0] as string;
		expect(output).toContain("# Skills Check Audit Report");
	});

	it("outputs sarif format", async () => {
		const logSpy = vi.mocked(console.log);
		await auditCommand(".", { format: "sarif" });
		expect(logSpy).toHaveBeenCalled();
		const output = logSpy.mock.calls[0][0] as string;
		const parsed = JSON.parse(output);
		expect(parsed.version).toBe("2.1.0");
	});

	it("suppresses output with --quiet", async () => {
		const logSpy = vi.mocked(console.log);
		await auditCommand(".", { quiet: true });
		expect(logSpy).not.toHaveBeenCalled();
	});

	it("shows progress with --verbose", async () => {
		const errorSpy = vi.mocked(console.error);
		await auditCommand(".", { verbose: true });
		const allOutput = errorSpy.mock.calls.map((c) => c[0]).join("\n");
		expect(allOutput).toContain("Auditing");
		expect(allOutput).toContain("Scanned");
	});
});
