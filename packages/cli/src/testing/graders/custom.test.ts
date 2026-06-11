import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gradeCustom } from "./custom.js";

describe("gradeCustom", () => {
	let dir: string;

	beforeEach(async () => {
		dir = join(
			tmpdir(),
			`skills-check-custom-${Date.now()}-${Math.random().toString(36).slice(2)}`
		);
		await mkdir(dir, { recursive: true });
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	async function writeModule(name: string, source: string): Promise<string> {
		const p = join(dir, name);
		await writeFile(p, source, "utf-8");
		return p;
	}

	it("fails when module does not exist", async () => {
		const result = await gradeCustom(dir, join(dir, "missing.mjs"));
		expect(result.passed).toBe(false);
		expect(result.grader).toBe("custom");
		expect(result.message).toContain("failed to execute");
	});

	it("fails when module has no grade function", async () => {
		const mod = await writeModule("nograde.mjs", "export const notGrade = 1;\n");
		const result = await gradeCustom(dir, mod);
		expect(result.passed).toBe(false);
		expect(result.message).toContain("does not export a grade()");
	});

	it("returns the grade() result on success", async () => {
		const mod = await writeModule(
			"ok.mjs",
			"export function grade(ctx) { return { passed: true, message: 'ok:' + ctx.workDir }; }\n"
		);
		const result = await gradeCustom(dir, mod);
		expect(result.passed).toBe(true);
		expect(result.message).toContain("ok:");
	});

	it("runs with a dropped environment so secrets do not leak", async () => {
		process.env.SKILLS_CHECK_TEST_SECRET = "topsecret";
		try {
			const mod = await writeModule(
				"env.mjs",
				"export function grade() { const v = process.env.SKILLS_CHECK_TEST_SECRET; return { passed: v === undefined, message: 'secret=' + String(v) }; }\n"
			);
			const result = await gradeCustom(dir, mod);
			expect(result.passed).toBe(true);
			expect(result.message).toContain("secret=undefined");
		} finally {
			process.env.SKILLS_CHECK_TEST_SECRET = undefined;
		}
	});

	it("enforces a timeout on a hanging grader", async () => {
		const mod = await writeModule("hang.mjs", "export function grade() { while (true) {} }\n");
		const result = await gradeCustom(dir, mod, 400);
		expect(result.passed).toBe(false);
		expect(result.message).toContain("timed out");
	});
});
