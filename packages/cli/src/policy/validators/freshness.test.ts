import { describe, expect, it } from "vitest";
import type { SkillFile } from "../../skill-io.js";
import type { SkillPolicy } from "../types.js";
import { checkFreshness } from "./freshness.js";

function makeSkillFile(frontmatter: Record<string, unknown>, content?: string): SkillFile {
	const c = content ?? "# Test\n";
	return {
		path: "skills/test/SKILL.md",
		frontmatter,
		content: c,
		raw: `---\n---\n${c}`,
	};
}

describe("checkFreshness", () => {
	it("returns no findings when no freshness policy", () => {
		const findings = checkFreshness(makeSkillFile({}), { version: 1 });
		expect(findings).toEqual([]);
	});

	it("warns when skill is too old", () => {
		const oldDate = new Date();
		oldDate.setDate(oldDate.getDate() - 100);
		const file = makeSkillFile({
			"last-verified": oldDate.toISOString(),
		});
		const policy: SkillPolicy = {
			version: 1,
			freshness: { max_age_days: 90 },
		};
		const findings = checkFreshness(file, policy);
		expect(findings).toHaveLength(1);
		expect(findings[0].severity).toBe("warning");
		expect(findings[0].message).toContain("100");
		expect(findings[0].message).toContain("max: 90");
	});

	it("does not warn when skill is fresh enough", () => {
		const recentDate = new Date();
		recentDate.setDate(recentDate.getDate() - 10);
		const file = makeSkillFile({
			"last-verified": recentDate.toISOString(),
		});
		const policy: SkillPolicy = {
			version: 1,
			freshness: { max_age_days: 90 },
		};
		const findings = checkFreshness(file, policy);
		expect(findings).toEqual([]);
	});

	it("warns when no last-verified date and max_age_days set", () => {
		const file = makeSkillFile({});
		const policy: SkillPolicy = {
			version: 1,
			freshness: { max_age_days: 90 },
		};
		const findings = checkFreshness(file, policy);
		expect(findings).toHaveLength(1);
		expect(findings[0].message).toContain("No last-verified date");
	});

	it("flags product-referencing skill without product-version", () => {
		const content = "# AI SDK\n\nUse `npm install ai` to install AI SDK 4.0.\n";
		const file = makeSkillFile({}, content);
		const policy: SkillPolicy = {
			version: 1,
			freshness: { require_product_version: true },
		};
		const findings = checkFreshness(file, policy);
		expect(findings).toHaveLength(1);
		expect(findings[0].rule).toBe("freshness.require_product_version");
	});

	it("does not flag skill with product-version set", () => {
		const content = "# AI SDK\n\nUse `npm install ai` to install AI SDK 4.0.\n";
		const file = makeSkillFile({ "product-version": "4.0.0" }, content);
		const policy: SkillPolicy = {
			version: 1,
			freshness: { require_product_version: true },
		};
		const findings = checkFreshness(file, policy);
		expect(findings).toEqual([]);
	});

	it("does not flag non-product skill without product-version", () => {
		const content = "# General Coding Tips\n\nUse descriptive variable names.\n";
		const file = makeSkillFile({}, content);
		const policy: SkillPolicy = {
			version: 1,
			freshness: { require_product_version: true },
		};
		const findings = checkFreshness(file, policy);
		expect(findings).toEqual([]);
	});
});
