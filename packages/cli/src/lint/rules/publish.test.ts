import { describe, expect, it } from "vitest";
import type { SkillFile } from "../../skill-io.js";
import { checkPublishReady } from "./publish.js";

function makeFile(frontmatter: Record<string, unknown>): SkillFile {
	return {
		path: "test/SKILL.md",
		frontmatter,
		content: "Some content here.",
		raw: "---\n---\nSome content here.",
	};
}

describe("checkPublishReady", () => {
	it("returns no findings when all publish fields are valid", () => {
		const file = makeFile({
			author: "test-author",
			license: "MIT",
			repository: "https://github.com/test/repo",
		});
		expect(checkPublishReady(file)).toEqual([]);
	});

	it("reports missing author as fixable", () => {
		const file = makeFile({
			license: "MIT",
			repository: "https://github.com/test/repo",
		});
		const findings = checkPublishReady(file);
		const authorFinding = findings.find((f) => f.field === "author");
		expect(authorFinding).toBeDefined();
		expect(authorFinding?.level).toBe("error");
		expect(authorFinding?.fixable).toBe(true);
	});

	it("reports missing license as fixable", () => {
		const file = makeFile({
			author: "test-author",
			repository: "https://github.com/test/repo",
		});
		const findings = checkPublishReady(file);
		const licenseFinding = findings.find((f) => f.field === "license");
		expect(licenseFinding).toBeDefined();
		expect(licenseFinding?.fixable).toBe(true);
	});

	it("reports missing repository as fixable", () => {
		const file = makeFile({
			author: "test-author",
			license: "MIT",
		});
		const findings = checkPublishReady(file);
		const repoFinding = findings.find((f) => f.field === "repository");
		expect(repoFinding).toBeDefined();
		expect(repoFinding?.fixable).toBe(true);
	});

	it("reports invalid SPDX license as not fixable", () => {
		const file = makeFile({
			author: "test-author",
			license: "INVALID",
			repository: "https://github.com/test/repo",
		});
		const findings = checkPublishReady(file);
		const licenseFinding = findings.find((f) => f.field === "license");
		expect(licenseFinding).toBeDefined();
		expect(licenseFinding?.message).toContain("Invalid SPDX");
		expect(licenseFinding?.fixable).toBe(false);
	});

	it("reports invalid repository URL as not fixable", () => {
		const file = makeFile({
			author: "test-author",
			license: "MIT",
			repository: "not-a-url",
		});
		const findings = checkPublishReady(file);
		const repoFinding = findings.find((f) => f.field === "repository");
		expect(repoFinding).toBeDefined();
		expect(repoFinding?.message).toContain("not a valid URL");
		expect(repoFinding?.fixable).toBe(false);
	});

	it("reports non-string author as not fixable", () => {
		const file = makeFile({
			author: 42,
			license: "MIT",
			repository: "https://github.com/test/repo",
		});
		const findings = checkPublishReady(file);
		const authorFinding = findings.find((f) => f.field === "author");
		expect(authorFinding).toBeDefined();
		expect(authorFinding?.message).toContain("must be a string");
		expect(authorFinding?.fixable).toBe(false);
	});

	it("reports all three missing fields", () => {
		const file = makeFile({});
		const findings = checkPublishReady(file);
		expect(findings).toHaveLength(3);
		expect(findings.map((f) => f.field).sort()).toEqual(["author", "license", "repository"]);
	});
});
