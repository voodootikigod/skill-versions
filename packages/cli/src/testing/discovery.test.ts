import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock readSkillFile to avoid gray-matter dependency issues in tests
vi.mock("../skill-io.js", () => ({
	readSkillFile: vi.fn(async (path: string) => ({
		path,
		frontmatter: { name: "test-skill" },
		content: "# Test Skill",
		raw: "---\nname: test-skill\n---\n# Test Skill",
	})),
}));

import { discoverTestableSkills } from "./discovery.js";

describe("discoverTestableSkills", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = join(tmpdir(), `skillsafe-test-discovery-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
		vi.restoreAllMocks();
	});

	it("finds skills with tests/cases.yaml", async () => {
		// Create skill with tests
		const skillDir = join(tempDir, "my-skill");
		const testsDir = join(skillDir, "tests");
		await mkdir(testsDir, { recursive: true });
		await writeFile(join(skillDir, "SKILL.md"), "# My Skill");
		await writeFile(
			join(testsDir, "cases.yaml"),
			'suite:\n  name: test\ncases:\n  - id: t1\n    type: outcome\n    prompt: "test"'
		);

		const results = await discoverTestableSkills(tempDir);
		expect(results).toHaveLength(1);
		expect(results[0].skillPath).toContain("SKILL.md");
		expect(results[0].casesPath).toContain("cases.yaml");
	});

	it("finds skills with tests/cases.yml", async () => {
		const skillDir = join(tempDir, "my-skill");
		const testsDir = join(skillDir, "tests");
		await mkdir(testsDir, { recursive: true });
		await writeFile(join(skillDir, "SKILL.md"), "# My Skill");
		await writeFile(
			join(testsDir, "cases.yml"),
			'suite:\n  name: test\ncases:\n  - id: t1\n    type: outcome\n    prompt: "test"'
		);

		const results = await discoverTestableSkills(tempDir);
		expect(results).toHaveLength(1);
		expect(results[0].casesPath).toContain("cases.yml");
	});

	it("skips skills without tests directory", async () => {
		const skillDir = join(tempDir, "no-tests");
		await mkdir(skillDir, { recursive: true });
		await writeFile(join(skillDir, "SKILL.md"), "# No Tests");

		const results = await discoverTestableSkills(tempDir);
		expect(results).toHaveLength(0);
	});

	it("filters by skill name", async () => {
		// Create two skills
		for (const name of ["skill-a", "skill-b"]) {
			const skillDir = join(tempDir, name);
			const testsDir = join(skillDir, "tests");
			await mkdir(testsDir, { recursive: true });
			await writeFile(join(skillDir, "SKILL.md"), `# ${name}`);
			await writeFile(
				join(testsDir, "cases.yaml"),
				`suite:\n  name: ${name}\ncases:\n  - id: t1\n    type: outcome\n    prompt: "test"`
			);
		}

		const results = await discoverTestableSkills(tempDir, "skill-a");
		expect(results).toHaveLength(1);
		expect(results[0].skillPath).toContain("skill-a");
	});

	it("returns empty for empty directory", async () => {
		const results = await discoverTestableSkills(tempDir);
		expect(results).toHaveLength(0);
	});
});
