import { describe, expect, it } from "vitest";
import type { SkillFile } from "../../skill-io.js";
import type { SkillPolicy } from "../types.js";
import { checkMetadata } from "./metadata.js";

function makeSkillFile(frontmatter: Record<string, unknown>): SkillFile {
	return {
		path: "skills/test/SKILL.md",
		frontmatter,
		content: "# Test\n",
		raw: "---\n---\n# Test\n",
	};
}

describe("checkMetadata", () => {
	it("returns no findings when no metadata policy", () => {
		const findings = checkMetadata(makeSkillFile({}), { version: 1 });
		expect(findings).toEqual([]);
	});

	it("flags missing required fields", () => {
		const policy: SkillPolicy = {
			version: 1,
			metadata: { required_fields: ["name", "description"] },
		};
		const findings = checkMetadata(makeSkillFile({}), policy);
		expect(findings).toHaveLength(2);
		expect(findings[0].message).toContain("name");
		expect(findings[1].message).toContain("description");
	});

	it("does not flag present required fields", () => {
		const policy: SkillPolicy = {
			version: 1,
			metadata: { required_fields: ["name", "description"] },
		};
		const file = makeSkillFile({ name: "test", description: "A test skill" });
		const findings = checkMetadata(file, policy);
		expect(findings).toEqual([]);
	});

	it("flags missing license when require_license is true", () => {
		const policy: SkillPolicy = {
			version: 1,
			metadata: { require_license: true },
		};
		const findings = checkMetadata(makeSkillFile({}), policy);
		expect(findings).toHaveLength(1);
		expect(findings[0].message).toContain("license");
	});

	it("flags invalid SPDX license", () => {
		const policy: SkillPolicy = {
			version: 1,
			metadata: { require_license: true },
		};
		const findings = checkMetadata(makeSkillFile({ license: "NotALicense" }), policy);
		expect(findings).toHaveLength(1);
		expect(findings[0].message).toContain("Invalid SPDX");
	});

	it("accepts valid SPDX license", () => {
		const policy: SkillPolicy = {
			version: 1,
			metadata: { require_license: true },
		};
		const findings = checkMetadata(makeSkillFile({ license: "MIT" }), policy);
		expect(findings).toEqual([]);
	});

	it("flags license not in allowed list", () => {
		const policy: SkillPolicy = {
			version: 1,
			metadata: { allowed_licenses: ["MIT", "Apache-2.0"] },
		};
		const findings = checkMetadata(makeSkillFile({ license: "GPL-3.0-only" }), policy);
		expect(findings).toHaveLength(1);
		expect(findings[0].message).toContain("not in the allowed list");
	});

	it("accepts license in allowed list", () => {
		const policy: SkillPolicy = {
			version: 1,
			metadata: { allowed_licenses: ["MIT", "Apache-2.0"] },
		};
		const findings = checkMetadata(makeSkillFile({ license: "MIT" }), policy);
		expect(findings).toEqual([]);
	});

	it("does not check allowed_licenses when no license field", () => {
		const policy: SkillPolicy = {
			version: 1,
			metadata: { allowed_licenses: ["MIT"] },
		};
		const findings = checkMetadata(makeSkillFile({}), policy);
		expect(findings).toEqual([]);
	});
});
