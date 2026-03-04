import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gradeJsonMatch } from "./json-match.js";

describe("gradeJsonMatch", () => {
	let workDir: string;

	beforeEach(async () => {
		workDir = join(tmpdir(), `skillsafe-test-json-${Date.now()}`);
		await mkdir(workDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(workDir, { recursive: true, force: true });
	});

	it("passes when structure matches", async () => {
		await writeFile(join(workDir, "config.json"), JSON.stringify({ name: "test", version: "1.0" }));

		const result = await gradeJsonMatch(workDir, "config.json", {
			name: "string",
			version: "string",
		});
		expect(result.passed).toBe(true);
	});

	it("fails when key is missing", async () => {
		await writeFile(join(workDir, "config.json"), JSON.stringify({ name: "test" }));

		const result = await gradeJsonMatch(workDir, "config.json", {
			name: "string",
			version: "string",
		});
		expect(result.passed).toBe(false);
		expect(result.detail).toContain("version");
	});

	it("fails when type does not match", async () => {
		await writeFile(
			join(workDir, "config.json"),
			JSON.stringify({ name: "test", count: "not-a-number" })
		);

		const result = await gradeJsonMatch(workDir, "config.json", {
			name: "string",
			count: "number",
		});
		expect(result.passed).toBe(false);
		expect(result.detail).toContain("number");
	});

	it("handles nested objects", async () => {
		await writeFile(join(workDir, "config.json"), JSON.stringify({ meta: { author: "me" } }));

		const result = await gradeJsonMatch(workDir, "config.json", {
			meta: { author: "string" },
		});
		expect(result.passed).toBe(true);
	});

	it("fails for non-JSON file", async () => {
		await writeFile(join(workDir, "bad.json"), "not json");

		const result = await gradeJsonMatch(workDir, "bad.json", { key: "string" });
		expect(result.passed).toBe(false);
		expect(result.message).toContain("not valid JSON");
	});

	it("fails when file does not exist", async () => {
		const result = await gradeJsonMatch(workDir, "missing.json", { key: "string" });
		expect(result.passed).toBe(false);
		expect(result.message).toContain("Could not read");
	});
});
