import { describe, expect, it } from "vitest";
import type { SkillFile } from "../../skill-io.js";
import type { SkillPolicy } from "../types.js";
import { checkRequired } from "./required.js";

function makeSkillFile(name: string, source?: string): SkillFile {
	return {
		path: `skills/${name}/SKILL.md`,
		frontmatter: {
			name,
			...(source ? { source } : {}),
		},
		content: `# ${name}\n`,
		raw: `---\nname: ${name}\n---\n# ${name}\n`,
	};
}

describe("checkRequired", () => {
	it("returns empty when no required policy", () => {
		const result = checkRequired([], { version: 1 });
		expect(result).toEqual([]);
	});

	it("marks satisfied when skill is present", () => {
		const skills = [makeSkillFile("coding-standards")];
		const policy: SkillPolicy = {
			version: 1,
			required: [{ skill: "coding-standards" }],
		};
		const result = checkRequired(skills, policy);
		expect(result).toEqual([{ skill: "coding-standards", satisfied: true }]);
	});

	it("marks unsatisfied when skill is missing", () => {
		const skills = [makeSkillFile("other-skill")];
		const policy: SkillPolicy = {
			version: 1,
			required: [{ skill: "coding-standards" }],
		};
		const result = checkRequired(skills, policy);
		expect(result).toEqual([{ skill: "coding-standards", satisfied: false }]);
	});

	it("matches by source when specified", () => {
		const skills = [makeSkillFile("coding-standards", "wrong-org/skills")];
		const policy: SkillPolicy = {
			version: 1,
			required: [{ skill: "coding-standards", source: "our-org/skills" }],
		};
		const result = checkRequired(skills, policy);
		expect(result).toEqual([{ skill: "coding-standards", satisfied: false }]);
	});

	it("satisfies when both name and source match", () => {
		const skills = [makeSkillFile("coding-standards", "our-org/skills")];
		const policy: SkillPolicy = {
			version: 1,
			required: [{ skill: "coding-standards", source: "our-org/skills" }],
		};
		const result = checkRequired(skills, policy);
		expect(result).toEqual([{ skill: "coding-standards", satisfied: true }]);
	});

	it("handles multiple required skills", () => {
		const skills = [makeSkillFile("coding-standards"), makeSkillFile("security-review")];
		const policy: SkillPolicy = {
			version: 1,
			required: [
				{ skill: "coding-standards" },
				{ skill: "security-review" },
				{ skill: "missing-skill" },
			],
		};
		const result = checkRequired(skills, policy);
		expect(result).toEqual([
			{ skill: "coding-standards", satisfied: true },
			{ skill: "security-review", satisfied: true },
			{ skill: "missing-skill", satisfied: false },
		]);
	});
});
