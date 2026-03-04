import { describe, expect, it, vi } from "vitest";

// Mock child_process.exec
vi.mock("node:child_process", () => ({
	exec: vi.fn((cmd, opts, cb) => {
		if (typeof opts === "function") {
			opts(null, "generic output", "");
		} else if (typeof cb === "function") {
			cb(null, "generic output", "");
		}
		return { pid: 5678, kill: vi.fn() };
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

import { GenericHarness } from "./generic.js";

describe("GenericHarness", () => {
	it("has correct name", () => {
		const harness = new GenericHarness();
		expect(harness.name).toBe("generic");
	});

	it("is always available", async () => {
		const harness = new GenericHarness();
		expect(await harness.available()).toBe(true);
	});

	it("uses default command template", async () => {
		const { exec } = await import("node:child_process");
		const mockedExec = vi.mocked(exec);

		const harness = new GenericHarness();
		await harness.execute("Hello world", {
			workDir: "/tmp/test",
			timeout: 30,
		});

		const calledCommand = mockedExec.mock.calls[0][0] as string;
		expect(calledCommand).toContain("Hello world");
	});

	it("uses custom command template", async () => {
		const { exec } = await import("node:child_process");
		const mockedExec = vi.mocked(exec);
		mockedExec.mockClear();

		const harness = new GenericHarness('codex exec "{prompt}"');
		await harness.execute("Create a file", {
			workDir: "/tmp/test",
			timeout: 30,
		});

		const calledCommand = mockedExec.mock.calls[0][0] as string;
		expect(calledCommand).toContain("codex exec");
		expect(calledCommand).toContain("Create a file");
	});

	it("returns execution result", async () => {
		const harness = new GenericHarness();
		const result = await harness.execute("test", {
			workDir: "/tmp/test",
			timeout: 30,
		});

		expect(result.exitCode).toBe(0);
		expect(result.transcript).toBe("generic output");
		expect(result.duration).toBeGreaterThanOrEqual(0);
	});
});
