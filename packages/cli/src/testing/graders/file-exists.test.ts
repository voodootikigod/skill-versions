import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gradeFileExists } from "./file-exists.js";

describe("gradeFileExists", () => {
	let workDir: string;

	beforeEach(async () => {
		workDir = join(tmpdir(), `skills-check-test-fe-${Date.now()}`);
		await mkdir(workDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(workDir, { recursive: true, force: true });
	});

	it("passes when all files exist", async () => {
		await writeFile(join(workDir, "a.ts"), "content");
		await writeFile(join(workDir, "b.ts"), "content");

		const result = await gradeFileExists(workDir, ["a.ts", "b.ts"]);
		expect(result.passed).toBe(true);
		expect(result.grader).toBe("file-exists");
	});

	it("fails when some files are missing", async () => {
		await writeFile(join(workDir, "a.ts"), "content");

		const result = await gradeFileExists(workDir, ["a.ts", "b.ts"]);
		expect(result.passed).toBe(false);
		expect(result.detail).toContain("b.ts");
	});

	it("fails when all files are missing", async () => {
		const result = await gradeFileExists(workDir, ["x.ts", "y.ts"]);
		expect(result.passed).toBe(false);
		expect(result.message).toContain("Missing 2");
	});

	it("passes with nested paths", async () => {
		await mkdir(join(workDir, "src"), { recursive: true });
		await writeFile(join(workDir, "src", "index.ts"), "content");

		const result = await gradeFileExists(workDir, ["src/index.ts"]);
		expect(result.passed).toBe(true);
	});
});
