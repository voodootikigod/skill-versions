import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gradeCustom } from "./custom.js";

describe("gradeCustom", () => {
	let workDir: string;

	beforeEach(async () => {
		workDir = join(tmpdir(), `skills-check-test-custom-${Date.now()}`);
		await mkdir(workDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(workDir, { recursive: true, force: true });
	});

	it("fails when module does not exist", async () => {
		const result = await gradeCustom(workDir, "/nonexistent/module.ts");
		expect(result.passed).toBe(false);
		expect(result.grader).toBe("custom");
		expect(result.message).toContain("failed to execute");
	});

	it("fails when module has no grade function", async () => {
		// Use a real module that exists but doesn't export grade()
		const result = await gradeCustom(workDir, "node:path");
		expect(result.passed).toBe(false);
		expect(result.message).toContain("does not export a grade()");
	});
});
