import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SkillSection } from "../shared/sections.js";
import type { SkillFile } from "../skill-io.js";

vi.mock("./tokenizer.js", () => ({
	countTokens: vi.fn((text: string) => text.length),
	resetTokenizer: vi.fn(),
}));

import { analyzeSkill } from "./analyzer.js";

function makeSkillFile(overrides?: Partial<SkillFile>): SkillFile {
	return {
		path: "/skills/my-skill/SKILL.md",
		frontmatter: { name: "my-skill" },
		content: "Some content here.",
		raw: "---\nname: my-skill\n---\n\n# Title\n\nSome content here.",
		...overrides,
	};
}

function makeSections(): SkillSection[] {
	return [
		{
			heading: "",
			level: 0,
			content: "---\nname: my-skill\n---\n",
			startLine: 1,
			endLine: 4,
		},
		{
			heading: "Title",
			level: 1,
			content: "\nSome content here.",
			startLine: 5,
			endLine: 7,
		},
	];
}

describe("analyzeSkill", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns skill budget with name from frontmatter", () => {
		const file = makeSkillFile();
		const sections = makeSections();
		const result = analyzeSkill(file, sections);

		expect(result.name).toBe("my-skill");
		expect(result.path).toBe("/skills/my-skill/SKILL.md");
		expect(result.totalTokens).toBeGreaterThan(0);
	});

	it("falls back to directory name when frontmatter name is missing", () => {
		const file = makeSkillFile({ frontmatter: {} });
		const sections = makeSections();
		const result = analyzeSkill(file, sections);

		expect(result.name).toBe("my-skill");
	});

	it("computes per-section token budgets", () => {
		const file = makeSkillFile();
		const sections = makeSections();
		const result = analyzeSkill(file, sections);

		expect(result.sections).toHaveLength(2);
		expect(result.sections[0].heading).toBe("(preamble)");
		expect(result.sections[1].heading).toBe("Title");
	});

	it("computes section percentages", () => {
		const file = makeSkillFile();
		const sections = makeSections();
		const result = analyzeSkill(file, sections);

		// Each section percentage should be between 0 and 100
		for (const section of result.sections) {
			expect(section.percentage).toBeGreaterThanOrEqual(0);
			expect(section.percentage).toBeLessThanOrEqual(100);
		}
	});

	it("handles empty content", () => {
		const file = makeSkillFile({ raw: "", content: "", frontmatter: {} });
		const sections: SkillSection[] = [
			{ heading: "", level: 0, content: "", startLine: 1, endLine: 1 },
		];
		const result = analyzeSkill(file, sections);

		expect(result.totalTokens).toBe(0);
		expect(result.sections[0].percentage).toBe(0);
	});
});
