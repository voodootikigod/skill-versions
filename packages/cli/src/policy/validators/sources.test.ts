import { describe, expect, it } from "vitest";
import type { SkillFile } from "../../skill-io.js";
import type { SkillPolicy } from "../types.js";
import { checkSources } from "./sources.js";

function makeSkillFile(overrides?: Partial<SkillFile>): SkillFile {
	return {
		path: "skills/test/SKILL.md",
		frontmatter: {},
		content: "# Test Skill\n",
		raw: "---\n---\n# Test Skill\n",
		...overrides,
	};
}

describe("checkSources", () => {
	it("returns no findings when no sources policy", () => {
		const findings = checkSources(makeSkillFile(), { version: 1 });
		expect(findings).toEqual([]);
	});

	it("blocks skill not in allow list", () => {
		const file = makeSkillFile({
			frontmatter: { source: "random-user/sketchy-skills" },
		});
		const policy: SkillPolicy = {
			version: 1,
			sources: { allow: ["our-org/*"] },
		};
		const findings = checkSources(file, policy);
		expect(findings).toHaveLength(1);
		expect(findings[0].severity).toBe("blocked");
		expect(findings[0].rule).toBe("sources.allow");
	});

	it("allows skill matching allow list", () => {
		const file = makeSkillFile({
			frontmatter: { source: "our-org/awesome-skills" },
		});
		const policy: SkillPolicy = {
			version: 1,
			sources: { allow: ["our-org/*"] },
		};
		const findings = checkSources(file, policy);
		expect(findings).toEqual([]);
	});

	it("blocks skill matching deny list", () => {
		const file = makeSkillFile({
			frontmatter: { source: "untrusted-user/bad-skills" },
		});
		const policy: SkillPolicy = {
			version: 1,
			sources: { deny: ["untrusted-user/*"] },
		};
		const findings = checkSources(file, policy);
		expect(findings).toHaveLength(1);
		expect(findings[0].severity).toBe("blocked");
		expect(findings[0].rule).toBe("sources.deny");
	});

	it("deny takes precedence over allow", () => {
		const file = makeSkillFile({
			frontmatter: { source: "our-org/evil-fork" },
		});
		const policy: SkillPolicy = {
			version: 1,
			sources: {
				allow: ["our-org/*"],
				deny: ["our-org/evil-fork"],
			},
		};
		const findings = checkSources(file, policy);
		expect(findings).toHaveLength(1);
		expect(findings[0].severity).toBe("blocked");
		expect(findings[0].rule).toBe("sources.deny");
	});

	it("uses repository field as fallback for source", () => {
		const file = makeSkillFile({
			frontmatter: { repository: "our-org/skills" },
		});
		const policy: SkillPolicy = {
			version: 1,
			sources: { allow: ["our-org/*"] },
		};
		const findings = checkSources(file, policy);
		expect(findings).toEqual([]);
	});

	it("warns when no source field and allow list present", () => {
		const file = makeSkillFile({ frontmatter: {} });
		const policy: SkillPolicy = {
			version: 1,
			sources: { allow: ["our-org/*"] },
		};
		const findings = checkSources(file, policy);
		expect(findings).toHaveLength(1);
		expect(findings[0].severity).toBe("warning");
	});

	it("handles npm: prefixed patterns", () => {
		const file = makeSkillFile({
			frontmatter: { source: "npm:@our-org/skill-pack" },
		});
		const policy: SkillPolicy = {
			version: 1,
			sources: { allow: ["npm:@our-org/*"] },
		};
		const findings = checkSources(file, policy);
		expect(findings).toEqual([]);
	});

	it("exact match works", () => {
		const file = makeSkillFile({
			frontmatter: { source: "anthropics/skills" },
		});
		const policy: SkillPolicy = {
			version: 1,
			sources: { allow: ["anthropics/skills"] },
		};
		const findings = checkSources(file, policy);
		expect(findings).toEqual([]);
	});
});
