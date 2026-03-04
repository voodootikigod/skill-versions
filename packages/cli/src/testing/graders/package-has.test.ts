import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gradePackageHas } from "./package-has.js";

describe("gradePackageHas", () => {
	let workDir: string;

	beforeEach(async () => {
		workDir = join(tmpdir(), `skillsafe-test-pkg-${Date.now()}`);
		await mkdir(workDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(workDir, { recursive: true, force: true });
	});

	it("passes when dependencies exist", async () => {
		await writeFile(
			join(workDir, "package.json"),
			JSON.stringify({
				dependencies: { express: "^4.0.0" },
				devDependencies: { vitest: "^1.0.0" },
			})
		);

		const result = await gradePackageHas(workDir, ["express"], ["vitest"]);
		expect(result.passed).toBe(true);
	});

	it("fails when dependency is missing", async () => {
		await writeFile(
			join(workDir, "package.json"),
			JSON.stringify({ dependencies: { express: "^4.0.0" } })
		);

		const result = await gradePackageHas(workDir, ["express", "react"]);
		expect(result.passed).toBe(false);
		expect(result.detail).toContain("react");
	});

	it("fails when devDependency is missing", async () => {
		await writeFile(join(workDir, "package.json"), JSON.stringify({ devDependencies: {} }));

		const result = await gradePackageHas(workDir, undefined, ["vitest"]);
		expect(result.passed).toBe(false);
		expect(result.detail).toContain("vitest");
	});

	it("fails when package.json does not exist", async () => {
		const result = await gradePackageHas(workDir, ["express"]);
		expect(result.passed).toBe(false);
		expect(result.message).toContain("Could not read");
	});

	it("handles missing dependencies key", async () => {
		await writeFile(join(workDir, "package.json"), JSON.stringify({ name: "test" }));

		const result = await gradePackageHas(workDir, ["express"]);
		expect(result.passed).toBe(false);
	});
});
