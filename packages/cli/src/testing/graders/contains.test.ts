import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gradeContains } from "./contains.js";

describe("gradeContains", () => {
	let workDir: string;

	beforeEach(async () => {
		workDir = join(tmpdir(), `skillsafe-test-contains-${Date.now()}`);
		await mkdir(workDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(workDir, { recursive: true, force: true });
	});

	it("passes when all patterns match", async () => {
		await writeFile(join(workDir, "test.ts"), 'import { foo } from "bar";\nexport default foo;');

		const result = await gradeContains(workDir, "test.ts", ["import", "export"]);
		expect(result.passed).toBe(true);
		expect(result.grader).toBe("contains");
	});

	it("fails when pattern does not match", async () => {
		await writeFile(join(workDir, "test.ts"), "const x = 1;");

		const result = await gradeContains(workDir, "test.ts", ["import", "export"]);
		expect(result.passed).toBe(false);
		expect(result.detail).toContain("import");
	});

	it("supports regex patterns", async () => {
		await writeFile(join(workDir, "test.ts"), 'import { generateText } from "ai";');

		const result = await gradeContains(workDir, "test.ts", ["import.*ai"]);
		expect(result.passed).toBe(true);
	});

	it("fails when file does not exist", async () => {
		const result = await gradeContains(workDir, "missing.ts", ["anything"]);
		expect(result.passed).toBe(false);
		expect(result.message).toContain("Could not read");
	});

	it("not-contains passes when pattern is absent", async () => {
		await writeFile(join(workDir, "test.ts"), "const x = 1;");

		const result = await gradeContains(workDir, "test.ts", ["eval\\("], true);
		expect(result.passed).toBe(true);
		expect(result.grader).toBe("not-contains");
	});

	it("not-contains fails when pattern is present", async () => {
		await writeFile(join(workDir, "test.ts"), 'eval("code");');

		const result = await gradeContains(workDir, "test.ts", ["eval\\("], true);
		expect(result.passed).toBe(false);
	});
});
