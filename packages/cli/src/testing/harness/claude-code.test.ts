import { describe, expect, it, vi } from "vitest";

// Mock child_process.execFile
vi.mock("node:child_process", () => ({
	execFile: vi.fn((_cmd, _args, opts, cb) => {
		// Simulate successful execution
		if (typeof opts === "function") {
			opts(null, "output text", "");
		} else if (typeof cb === "function") {
			cb(null, "output text", "");
		}
		return { pid: 1234, kill: vi.fn() };
	}),
}));

// Mock fs operations
vi.mock("node:fs/promises", async () => {
	const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
	return {
		...actual,
		readdir: vi.fn().mockResolvedValue([]),
		stat: vi.fn().mockRejectedValue(new Error("not found")),
	};
});

import { ClaudeCodeHarness } from "./claude-code.js";

describe("ClaudeCodeHarness", () => {
	it("has correct name", () => {
		const harness = new ClaudeCodeHarness();
		expect(harness.name).toBe("claude-code");
	});

	it("executes with correct arguments", async () => {
		const { execFile } = await import("node:child_process");
		const mockedExecFile = vi.mocked(execFile);

		const harness = new ClaudeCodeHarness();
		await harness.execute("Create a file", {
			workDir: "/tmp/test",
			timeout: 30,
		});

		expect(mockedExecFile).toHaveBeenCalledWith(
			"claude",
			["--print", "--dangerously-skip-permissions", "Create a file"],
			expect.objectContaining({
				cwd: "/tmp/test",
				timeout: 30_000,
			}),
			expect.any(Function)
		);
	});

	it("returns execution result", async () => {
		const harness = new ClaudeCodeHarness();
		const result = await harness.execute("test prompt", {
			workDir: "/tmp/test",
			timeout: 30,
		});

		expect(result.exitCode).toBe(0);
		expect(result.transcript).toBe("output text");
		expect(result.filesCreated).toEqual([]);
		expect(result.duration).toBeGreaterThanOrEqual(0);
	});
});
