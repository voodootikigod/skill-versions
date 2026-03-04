import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discoverSkillFiles } from "./discovery.js";

describe("discoverSkillFiles", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "discovery-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it("returns empty array for empty directory", async () => {
		const result = await discoverSkillFiles(tempDir);
		expect(result).toEqual([]);
	});

	it("finds SKILL.md in a subdirectory", async () => {
		const skillDir = join(tempDir, "my-skill");
		await mkdir(skillDir);
		await writeFile(join(skillDir, "SKILL.md"), "# My Skill", "utf-8");

		const result = await discoverSkillFiles(tempDir);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe(join(skillDir, "SKILL.md"));
	});

	it("finds SKILL.md directly in the scanned directory", async () => {
		await writeFile(join(tempDir, "SKILL.md"), "# Root Skill", "utf-8");

		const result = await discoverSkillFiles(tempDir);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe(join(tempDir, "SKILL.md"));
	});

	it("finds multiple SKILL.md files across subdirectories", async () => {
		const skillA = join(tempDir, "alpha");
		const skillB = join(tempDir, "beta");
		await mkdir(skillA);
		await mkdir(skillB);
		await writeFile(join(skillA, "SKILL.md"), "# Alpha", "utf-8");
		await writeFile(join(skillB, "SKILL.md"), "# Beta", "utf-8");

		const result = await discoverSkillFiles(tempDir);
		expect(result).toHaveLength(2);
	});

	it("returns results sorted alphabetically", async () => {
		const skillZ = join(tempDir, "zeta");
		const skillA = join(tempDir, "alpha");
		await mkdir(skillZ);
		await mkdir(skillA);
		await writeFile(join(skillZ, "SKILL.md"), "# Zeta", "utf-8");
		await writeFile(join(skillA, "SKILL.md"), "# Alpha", "utf-8");

		const result = await discoverSkillFiles(tempDir);
		expect(result).toHaveLength(2);
		// alpha comes before zeta alphabetically
		expect(result[0]).toContain("alpha");
		expect(result[1]).toContain("zeta");
	});

	it("recurses into nested directories when no SKILL.md at current level", async () => {
		const nested = join(tempDir, "level1", "level2", "deep-skill");
		await mkdir(nested, { recursive: true });
		await writeFile(join(nested, "SKILL.md"), "# Deep Skill", "utf-8");

		const result = await discoverSkillFiles(tempDir);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe(join(nested, "SKILL.md"));
	});

	it("does not recurse into directory that already has SKILL.md", async () => {
		const parent = join(tempDir, "parent");
		const child = join(parent, "child");
		await mkdir(child, { recursive: true });
		await writeFile(join(parent, "SKILL.md"), "# Parent Skill", "utf-8");
		await writeFile(join(child, "SKILL.md"), "# Child Skill", "utf-8");

		const result = await discoverSkillFiles(tempDir);
		// Should find the parent SKILL.md but not recurse into child
		expect(result).toHaveLength(1);
		expect(result[0]).toBe(join(parent, "SKILL.md"));
	});

	it("ignores non-SKILL.md files", async () => {
		await writeFile(join(tempDir, "README.md"), "# Readme", "utf-8");
		await writeFile(join(tempDir, "notes.txt"), "notes", "utf-8");

		const result = await discoverSkillFiles(tempDir);
		expect(result).toEqual([]);
	});

	it("throws for nonexistent directory", async () => {
		await expect(discoverSkillFiles("/nonexistent/path/xyz")).rejects.toThrow(
			"Cannot read directory"
		);
	});
});
