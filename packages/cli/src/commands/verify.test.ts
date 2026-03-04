import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VerifyReport } from "../verify/types.js";

// Mock runVerify to avoid filesystem/git/network
vi.mock("../verify/index.js", () => ({
	runVerify: vi.fn(),
}));

import { runVerify } from "../verify/index.js";
import { verifyCommand } from "./verify.js";

const mockedRunVerify = vi.mocked(runVerify);

function makeReport(overrides?: Partial<VerifyReport>): VerifyReport {
	return {
		results: [],
		summary: { passed: 0, failed: 0, skipped: 0 },
		generatedAt: "2026-03-03T00:00:00.000Z",
		...overrides,
	};
}

describe("verifyCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedRunVerify.mockResolvedValue(makeReport());
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns 0 for clean report with --all", async () => {
		const code = await verifyCommand({ all: true });
		expect(code).toBe(0);
	});

	it("returns 1 when mismatches are found", async () => {
		mockedRunVerify.mockResolvedValue(
			makeReport({
				results: [
					{
						skill: "test",
						file: "test.md",
						declaredBefore: "1.0.0",
						declaredAfter: "1.0.1",
						declaredBump: "patch",
						assessedBump: "major",
						match: false,
						signals: [],
						explanation: "Insufficient bump",
						llmUsed: false,
					},
				],
				summary: { passed: 0, failed: 1, skipped: 0 },
			}),
		);

		const code = await verifyCommand({ all: true });
		expect(code).toBe(1);
	});

	it("returns 2 for invalid options: verbose + quiet", async () => {
		const code = await verifyCommand({ verbose: true, quiet: true, all: true });
		expect(code).toBe(2);
	});

	it("returns 2 when --before without --after", async () => {
		const code = await verifyCommand({ before: "some/path" });
		expect(code).toBe(2);
	});

	it("returns 2 when --after without --before", async () => {
		const code = await verifyCommand({ after: "some/path" });
		expect(code).toBe(2);
	});

	it("returns 2 when no mode specified", async () => {
		const code = await verifyCommand({});
		expect(code).toBe(2);
	});

	it("passes options to runVerify with --skill", async () => {
		await verifyCommand({ skill: "my-skill" });
		expect(mockedRunVerify).toHaveBeenCalledWith(expect.objectContaining({ skill: "my-skill" }));
	});

	it("passes before/after options to runVerify", async () => {
		await verifyCommand({ before: "a.md", after: "b.md" });
		expect(mockedRunVerify).toHaveBeenCalledWith(
			expect.objectContaining({ before: "a.md", after: "b.md" }),
		);
	});

	it("outputs json format", async () => {
		const logSpy = vi.mocked(console.log);
		await verifyCommand({ all: true, format: "json" });
		expect(logSpy).toHaveBeenCalled();
		const output = logSpy.mock.calls[0][0] as string;
		const parsed = JSON.parse(output);
		expect(parsed.results).toEqual([]);
	});

	it("suppresses output with --quiet", async () => {
		const logSpy = vi.mocked(console.log);
		await verifyCommand({ all: true, quiet: true });
		expect(logSpy).not.toHaveBeenCalled();
	});

	it("writes report to file with --output", async () => {
		const outPath = join(tmpdir(), `verify-test-${Date.now()}.json`);
		await verifyCommand({ all: true, format: "json", output: outPath });

		const content = await readFile(outPath, "utf-8");
		const parsed = JSON.parse(content);
		expect(parsed.results).toEqual([]);

		// Cleanup
		const { rm } = await import("node:fs/promises");
		await rm(outPath, { force: true });
	});

	it("shows progress with --verbose", async () => {
		const errorSpy = vi.mocked(console.error);
		await verifyCommand({ all: true, verbose: true });
		const allOutput = errorSpy.mock.calls.map((c) => c[0]).join("\n");
		expect(allOutput).toContain("Verifying");
	});

	it("passes skipLlm option", async () => {
		await verifyCommand({ all: true, skipLlm: true });
		expect(mockedRunVerify).toHaveBeenCalledWith(expect.objectContaining({ skipLlm: true }));
	});
});
