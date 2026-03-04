import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gradeCommand } from "./command.js";

describe("gradeCommand", () => {
	let workDir: string;

	beforeEach(async () => {
		workDir = join(tmpdir(), `skillsafe-test-cmd-${Date.now()}`);
		await mkdir(workDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(workDir, { recursive: true, force: true });
	});

	it("passes when exit code matches expected", async () => {
		const result = await gradeCommand(workDir, "echo hello", 0);
		expect(result.passed).toBe(true);
		expect(result.grader).toBe("command");
	});

	it("fails when exit code does not match", async () => {
		const result = await gradeCommand(workDir, "exit 1", 0);
		expect(result.passed).toBe(false);
		expect(result.message).toContain("exited with code 1");
	});

	it("passes when expecting non-zero exit code", async () => {
		const result = await gradeCommand(workDir, "exit 1", 1);
		expect(result.passed).toBe(true);
	});

	it("handles command that does not exist", async () => {
		const result = await gradeCommand(workDir, "nonexistent_command_12345", 0);
		expect(result.passed).toBe(false);
	});
});
