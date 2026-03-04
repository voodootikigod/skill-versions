import { describe, expect, it } from "vitest";
import type { SkillFile } from "../../skill-io.js";
import { checkRequired } from "./required.js";

function makeFile(frontmatter: Record<string, unknown>): SkillFile {
	return {
		path: "test/SKILL.md",
		frontmatter,
		content: "Some content here.",
		raw: "---\n---\nSome content here.",
	};
}

describe("checkRequired", () => {
	it("returns no findings for valid name and description", () => {
		const file = makeFile({
			name: "my-skill",
			description: "A useful skill for testing purposes and more.",
		});
		expect(checkRequired(file)).toEqual([]);
	});

	it("reports missing name", () => {
		const file = makeFile({ description: "A useful skill for testing purposes and more." });
		const findings = checkRequired(file);
		expect(findings).toHaveLength(1);
		expect(findings[0].field).toBe("name");
		expect(findings[0].level).toBe("error");
	});

	it("reports empty name", () => {
		const file = makeFile({
			name: "  ",
			description: "A useful skill for testing purposes and more.",
		});
		const findings = checkRequired(file);
		expect(findings).toHaveLength(1);
		expect(findings[0].field).toBe("name");
	});

	it("reports name exceeding max length", () => {
		const file = makeFile({
			name: "a".repeat(101),
			description: "A useful skill for testing purposes and more.",
		});
		const findings = checkRequired(file);
		expect(findings).toHaveLength(1);
		expect(findings[0].field).toBe("name");
		expect(findings[0].message).toContain("exceeds maximum length");
	});

	it("reports non-string name", () => {
		const file = makeFile({
			name: 123,
			description: "A useful skill for testing purposes and more.",
		});
		const findings = checkRequired(file);
		expect(findings).toHaveLength(1);
		expect(findings[0].message).toContain("must be a string");
	});

	it("reports missing description", () => {
		const file = makeFile({ name: "my-skill" });
		const findings = checkRequired(file);
		expect(findings).toHaveLength(1);
		expect(findings[0].field).toBe("description");
		expect(findings[0].level).toBe("error");
	});

	it("reports description too short", () => {
		const file = makeFile({ name: "my-skill", description: "Short" });
		const findings = checkRequired(file);
		expect(findings).toHaveLength(1);
		expect(findings[0].field).toBe("description");
		expect(findings[0].message).toContain("too short");
	});

	it("reports description too long", () => {
		const file = makeFile({ name: "my-skill", description: "x".repeat(501) });
		const findings = checkRequired(file);
		expect(findings).toHaveLength(1);
		expect(findings[0].field).toBe("description");
		expect(findings[0].message).toContain("exceeds maximum length");
	});

	it("reports both missing name and description", () => {
		const file = makeFile({});
		const findings = checkRequired(file);
		expect(findings).toHaveLength(2);
		expect(findings.map((f) => f.field).sort()).toEqual(["description", "name"]);
	});

	it("marks all findings as not fixable", () => {
		const file = makeFile({});
		const findings = checkRequired(file);
		for (const f of findings) {
			expect(f.fixable).toBe(false);
		}
	});
});
