import { describe, expect, it } from "vitest";
import type { SkillFile } from "../../skill-io.js";
import { checkFormats } from "./format.js";

function makeFile(frontmatter: Record<string, unknown>): SkillFile {
	return {
		path: "test/SKILL.md",
		frontmatter,
		content: "Some content here.",
		raw: "---\n---\nSome content here.",
	};
}

describe("checkFormats", () => {
	it("returns no findings for valid formats", () => {
		const file = makeFile({
			name: "my-skill",
			"product-version": "4.18.0",
			repository: "https://github.com/test/repo",
			license: "MIT",
		});
		expect(checkFormats(file)).toEqual([]);
	});

	it("reports invalid semver for product-version", () => {
		const file = makeFile({ "product-version": "not-semver" });
		const findings = checkFormats(file);
		const pvFinding = findings.find((f) => f.field === "product-version");
		expect(pvFinding).toBeDefined();
		expect(pvFinding?.level).toBe("error");
		expect(pvFinding?.message).toContain("Invalid semver");
	});

	it("accepts valid semver for product-version", () => {
		const file = makeFile({ "product-version": "1.2.3" });
		const findings = checkFormats(file);
		expect(findings.filter((f) => f.field === "product-version")).toHaveLength(0);
	});

	it("accepts semver with prerelease", () => {
		const file = makeFile({ "product-version": "1.2.3-beta.1" });
		const findings = checkFormats(file);
		expect(findings.filter((f) => f.field === "product-version")).toHaveLength(0);
	});

	it("reports invalid URL for repository", () => {
		const file = makeFile({ repository: "not-a-url" });
		const findings = checkFormats(file);
		const repoFinding = findings.find((f) => f.field === "repository");
		expect(repoFinding).toBeDefined();
		expect(repoFinding?.level).toBe("error");
		expect(repoFinding?.message).toContain("Invalid URL");
	});

	it("reports invalid SPDX license", () => {
		const file = makeFile({ license: "INVALID-LICENSE" });
		const findings = checkFormats(file);
		const licenseFinding = findings.find((f) => f.field === "license");
		expect(licenseFinding).toBeDefined();
		expect(licenseFinding?.level).toBe("error");
		expect(licenseFinding?.message).toContain("Invalid SPDX");
	});

	it("accepts valid SPDX license expression", () => {
		const file = makeFile({ license: "MIT OR Apache-2.0" });
		const findings = checkFormats(file);
		expect(findings.filter((f) => f.field === "license")).toHaveLength(0);
	});

	it("reports name with special characters", () => {
		const file = makeFile({ name: "my skill!!" });
		const findings = checkFormats(file);
		const nameFinding = findings.find((f) => f.field === "name");
		expect(nameFinding).toBeDefined();
		expect(nameFinding?.message).toContain("invalid characters");
	});

	it("accepts name with hyphens and dots", () => {
		const file = makeFile({ name: "my-skill.v2" });
		const findings = checkFormats(file);
		expect(findings.filter((f) => f.field === "name")).toHaveLength(0);
	});

	it("accepts scoped name with @", () => {
		const file = makeFile({ name: "@org/my-skill" });
		const findings = checkFormats(file);
		expect(findings.filter((f) => f.field === "name")).toHaveLength(0);
	});

	it("skips validation for missing fields", () => {
		const file = makeFile({});
		expect(checkFormats(file)).toEqual([]);
	});

	it("skips validation for non-string fields", () => {
		const file = makeFile({
			"product-version": 123,
			repository: 456,
			license: true,
			name: 789,
		});
		expect(checkFormats(file)).toEqual([]);
	});
});
