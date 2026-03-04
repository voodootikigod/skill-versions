import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LintReport } from "../lint/types.js";

// Mock runLint to avoid filesystem access
vi.mock("../lint/index.js", () => ({
	runLint: vi.fn(),
}));

import { runLint } from "../lint/index.js";
import { lintCommand } from "./lint.js";

const mockedRunLint = vi.mocked(runLint);

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

describe("lintCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedRunLint.mockResolvedValue(makeReport());
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
		const code = await lintCommand(".", {});
		expect(code).toBe(0);
	});

	it("returns 1 when errors exist with default threshold", async () => {
		mockedRunLint.mockResolvedValue(
			makeReport({
				findings: [
					{
						file: "test.md",
						field: "name",
						level: "error",
						message: "Missing name",
						fixable: false,
					},
				],
				errors: 1,
			})
		);

		const code = await lintCommand(".", {});
		expect(code).toBe(1);
	});

	it("returns 0 when only warnings exist with default error threshold", async () => {
		mockedRunLint.mockResolvedValue(
			makeReport({
				findings: [
					{
						file: "test.md",
						field: "product-version",
						level: "warning",
						message: "Missing product-version",
						fixable: false,
					},
				],
				warnings: 1,
			})
		);

		const code = await lintCommand(".", {});
		expect(code).toBe(0);
	});

	it("returns 1 when warnings meet --fail-on warning threshold", async () => {
		mockedRunLint.mockResolvedValue(
			makeReport({
				findings: [
					{
						file: "test.md",
						field: "product-version",
						level: "warning",
						message: "Missing product-version",
						fixable: false,
					},
				],
				warnings: 1,
			})
		);

		const code = await lintCommand(".", { failOn: "warning" });
		expect(code).toBe(1);
	});

	it("returns 2 for invalid --fail-on value", async () => {
		const code = await lintCommand(".", { failOn: "banana" });
		expect(code).toBe(2);
	});

	it("passes --fix option to runLint", async () => {
		await lintCommand(".", { fix: true });
		expect(mockedRunLint).toHaveBeenCalledWith(["."], expect.objectContaining({ fix: true }));
	});

	it("outputs json format", async () => {
		const logSpy = vi.mocked(console.log);
		await lintCommand(".", { format: "json" });
		expect(logSpy).toHaveBeenCalled();
		const output = logSpy.mock.calls[0][0] as string;
		const parsed = JSON.parse(output);
		expect(parsed.files).toBe(1);
	});

	it("outputs terminal format by default", async () => {
		const logSpy = vi.mocked(console.log);
		await lintCommand(".", {});
		expect(logSpy).toHaveBeenCalled();
		const output = logSpy.mock.calls[0][0] as string;
		expect(output).toContain("skills-check lint");
	});

	it("writes report to file with --output", async () => {
		const outPath = join(tmpdir(), `lint-test-${Date.now()}.json`);
		await lintCommand(".", { format: "json", output: outPath });

		const content = await readFile(outPath, "utf-8");
		const parsed = JSON.parse(content);
		expect(parsed.files).toBe(1);
		expect(parsed.findings).toEqual([]);

		// Cleanup
		const { rm } = await import("node:fs/promises");
		await rm(outPath, { force: true });
	});

	it("returns 0 when only info findings exist with error threshold", async () => {
		mockedRunLint.mockResolvedValue(
			makeReport({
				findings: [
					{
						file: "test.md",
						field: "keywords",
						level: "info",
						message: "Missing keywords",
						fixable: false,
					},
				],
				infos: 1,
			})
		);

		const code = await lintCommand(".", {});
		expect(code).toBe(0);
	});
});
