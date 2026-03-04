import { describe, expect, it } from "vitest";
import type { SkillFile } from "../../skill-io.js";
import type { SkillPolicy } from "../types.js";
import { checkBanned } from "./banned.js";

function makeSkillFile(name: string): SkillFile {
	return {
		path: `skills/${name}/SKILL.md`,
		frontmatter: { name },
		content: `# ${name}\n`,
		raw: `---\nname: ${name}\n---\n# ${name}\n`,
	};
}

describe("checkBanned", () => {
	it("returns no findings when no banned policy", () => {
		const findings = checkBanned(makeSkillFile("test"), { version: 1 });
		expect(findings).toEqual([]);
	});

	it("blocks a banned skill by exact name", () => {
		const policy: SkillPolicy = {
			version: 1,
			banned: [{ skill: "deploy-to-prod-yolo", reason: "Unsafe" }],
		};
		const findings = checkBanned(makeSkillFile("deploy-to-prod-yolo"), policy);
		expect(findings).toHaveLength(1);
		expect(findings[0].severity).toBe("blocked");
		expect(findings[0].detail).toBe("Unsafe");
	});

	it("blocks a banned skill by glob pattern", () => {
		const policy: SkillPolicy = {
			version: 1,
			banned: [{ skill: "deploy-*", reason: "No deploy skills allowed" }],
		};
		const findings = checkBanned(makeSkillFile("deploy-yolo"), policy);
		expect(findings).toHaveLength(1);
		expect(findings[0].severity).toBe("blocked");
	});

	it("does not block a non-banned skill", () => {
		const policy: SkillPolicy = {
			version: 1,
			banned: [{ skill: "deploy-*" }],
		};
		const findings = checkBanned(makeSkillFile("coding-standards"), policy);
		expect(findings).toEqual([]);
	});

	it("handles skill with no name", () => {
		const file: SkillFile = {
			path: "skills/unnamed/SKILL.md",
			frontmatter: {},
			content: "# Unnamed\n",
			raw: "---\n---\n# Unnamed\n",
		};
		const policy: SkillPolicy = {
			version: 1,
			banned: [{ skill: "deploy-*" }],
		};
		const findings = checkBanned(file, policy);
		expect(findings).toEqual([]);
	});

	it("includes reason when provided", () => {
		const policy: SkillPolicy = {
			version: 1,
			banned: [{ skill: "bad-skill", reason: "Bypasses safety checks" }],
		};
		const findings = checkBanned(makeSkillFile("bad-skill"), policy);
		expect(findings[0].detail).toBe("Bypasses safety checks");
	});

	it("has no detail when reason not provided", () => {
		const policy: SkillPolicy = {
			version: 1,
			banned: [{ skill: "bad-skill" }],
		};
		const findings = checkBanned(makeSkillFile("bad-skill"), policy);
		expect(findings[0].detail).toBeUndefined();
	});
});
