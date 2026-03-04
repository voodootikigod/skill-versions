import { describe, expect, it } from "vitest";
import type { SkillFile } from "../../skill-io.js";
import { checkRecommended } from "./recommended.js";

function makeFile(frontmatter: Record<string, unknown>): SkillFile {
	return {
		path: "test/SKILL.md",
		frontmatter,
		content: "Some content here.",
		raw: "---\n---\nSome content here.",
	};
}

describe("checkRecommended", () => {
	it("returns no findings when all recommended fields are present", () => {
		const file = makeFile({
			"spec-version": "1.0",
			keywords: ["testing", "vitest"],
		});
		expect(checkRecommended(file)).toEqual([]);
	});

	it("reports missing spec-version as info", () => {
		const file = makeFile({ keywords: ["testing"] });
		const findings = checkRecommended(file);
		const svFinding = findings.find((f) => f.field === "spec-version");
		expect(svFinding).toBeDefined();
		expect(svFinding?.level).toBe("info");
	});

	it("reports non-string spec-version", () => {
		const file = makeFile({ "spec-version": 1.0, keywords: ["testing"] });
		const findings = checkRecommended(file);
		const svFinding = findings.find((f) => f.field === "spec-version");
		expect(svFinding).toBeDefined();
		expect(svFinding?.message).toContain("should be a string");
	});

	it("reports missing keywords as info", () => {
		const file = makeFile({ "spec-version": "1.0" });
		const findings = checkRecommended(file);
		const kwFinding = findings.find((f) => f.field === "keywords");
		expect(kwFinding).toBeDefined();
		expect(kwFinding?.level).toBe("info");
	});

	it("reports non-array keywords", () => {
		const file = makeFile({ "spec-version": "1.0", keywords: "testing" });
		const findings = checkRecommended(file);
		const kwFinding = findings.find((f) => f.field === "keywords");
		expect(kwFinding).toBeDefined();
		expect(kwFinding?.message).toContain("should be an array");
	});

	it("reports empty keywords array", () => {
		const file = makeFile({ "spec-version": "1.0", keywords: [] });
		const findings = checkRecommended(file);
		const kwFinding = findings.find((f) => f.field === "keywords");
		expect(kwFinding).toBeDefined();
		expect(kwFinding?.message).toContain("empty");
	});

	it("reports both missing recommended fields", () => {
		const file = makeFile({});
		const findings = checkRecommended(file);
		expect(findings).toHaveLength(2);
		expect(findings.map((f) => f.field).sort()).toEqual(["keywords", "spec-version"]);
	});

	it("marks all findings as not fixable", () => {
		const file = makeFile({});
		const findings = checkRecommended(file);
		for (const f of findings) {
			expect(f.fixable).toBe(false);
		}
	});
});
