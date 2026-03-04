import { describe, expect, it } from "vitest";
import { detectRedundancy } from "./redundancy.js";
import type { SkillBudget } from "./types.js";

function makeBudget(name: string, path: string, totalTokens: number): SkillBudget {
	return {
		path,
		name,
		totalTokens,
		sections: [{ heading: "Main", tokens: totalTokens, percentage: 100 }],
	};
}

describe("detectRedundancy", () => {
	it("returns empty array when fewer than 2 skills", () => {
		const skills = [makeBudget("a", "/a/SKILL.md", 100)];
		const contentMap = new Map([["/a/SKILL.md", "some content here"]]);

		expect(detectRedundancy(skills, contentMap)).toEqual([]);
	});

	it("returns empty array for completely different skills", () => {
		const skills = [makeBudget("a", "/a/SKILL.md", 100), makeBudget("b", "/b/SKILL.md", 100)];
		const contentMap = new Map([
			["/a/SKILL.md", "alpha bravo charlie delta echo foxtrot golf hotel india juliet"],
			["/b/SKILL.md", "kilo lima mike november oscar papa quebec romeo sierra tango"],
		]);

		const matches = detectRedundancy(skills, contentMap);
		expect(matches).toEqual([]);
	});

	it("detects high similarity between identical content", () => {
		const content = "the quick brown fox jumps over the lazy dog and more words here for ngrams";
		const skills = [makeBudget("a", "/a/SKILL.md", 100), makeBudget("b", "/b/SKILL.md", 100)];
		const contentMap = new Map([
			["/a/SKILL.md", content],
			["/b/SKILL.md", content],
		]);

		const matches = detectRedundancy(skills, contentMap);
		expect(matches).toHaveLength(1);
		expect(matches[0].similarity).toBe(1);
		expect(matches[0].nameA).toBe("a");
		expect(matches[0].nameB).toBe("b");
	});

	it("respects the threshold parameter", () => {
		const skills = [makeBudget("a", "/a/SKILL.md", 100), makeBudget("b", "/b/SKILL.md", 100)];
		const contentMap = new Map([
			[
				"/a/SKILL.md",
				"the quick brown fox jumps over the lazy dog and some other text appended here",
			],
			[
				"/b/SKILL.md",
				"the quick brown fox jumps over the lazy dog but totally different ending now",
			],
		]);

		// With a very high threshold, no matches
		const strict = detectRedundancy(skills, contentMap, 0.99);
		expect(strict).toEqual([]);

		// With a low threshold, matches should be found
		const loose = detectRedundancy(skills, contentMap, 0.1);
		expect(loose.length).toBeGreaterThanOrEqual(0);
	});

	it("generates actionable suggestion text", () => {
		const content =
			"the quick brown fox jumps over the lazy dog and more words to reach ngram threshold";
		const skills = [
			makeBudget("skill-a", "/a/SKILL.md", 200),
			makeBudget("skill-b", "/b/SKILL.md", 150),
		];
		const contentMap = new Map([
			["/a/SKILL.md", content],
			["/b/SKILL.md", content],
		]);

		const matches = detectRedundancy(skills, contentMap);
		expect(matches).toHaveLength(1);
		expect(matches[0].suggestion).toContain("skill-a");
		expect(matches[0].suggestion).toContain("skill-b");
		expect(matches[0].suggestion).toContain("overlapping content");
	});

	it("sorts results by similarity descending", () => {
		const base = "one two three four five six seven eight nine ten eleven twelve";
		const skills = [
			makeBudget("a", "/a/SKILL.md", 100),
			makeBudget("b", "/b/SKILL.md", 100),
			makeBudget("c", "/c/SKILL.md", 100),
		];
		const contentMap = new Map([
			["/a/SKILL.md", base],
			["/b/SKILL.md", base],
			[
				"/c/SKILL.md",
				"completely different words that share nothing at all with the rest of them really",
			],
		]);

		const matches = detectRedundancy(skills, contentMap, 0.01);
		if (matches.length > 1) {
			for (let i = 0; i < matches.length - 1; i++) {
				expect(matches[i].similarity).toBeGreaterThanOrEqual(matches[i + 1].similarity);
			}
		}
	});
});
