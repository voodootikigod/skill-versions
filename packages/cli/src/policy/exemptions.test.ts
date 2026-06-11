import { describe, expect, it } from "vitest";
import { applyExemptions, exemptionMatches, isExemptionActive } from "./exemptions.js";
import type { PolicyExemption, PolicyFinding } from "./types.js";

const NOW = new Date("2026-06-10T00:00:00.000Z");

function finding(rule: string, file = "skills/demo/SKILL.md"): PolicyFinding {
	return { file, rule, severity: "violation", message: `${rule} violated` };
}

describe("isExemptionActive", () => {
	it("is active with no expiry", () => {
		expect(isExemptionActive({ rule: "*", reason: "x" }, NOW)).toBe(true);
	});

	it("is active when expiry is in the future", () => {
		expect(isExemptionActive({ rule: "*", reason: "x", expires: "2026-12-31" }, NOW)).toBe(true);
	});

	it("is inactive when expiry is in the past", () => {
		expect(isExemptionActive({ rule: "*", reason: "x", expires: "2026-01-01" }, NOW)).toBe(false);
	});

	it("is inactive (fail-closed) when expiry is unparseable", () => {
		expect(isExemptionActive({ rule: "*", reason: "x", expires: "not-a-date" }, NOW)).toBe(false);
	});
});

describe("exemptionMatches", () => {
	it("matches by exact rule", () => {
		const ex: PolicyExemption = { rule: "sources.allow", reason: "x" };
		expect(exemptionMatches(ex, finding("sources.allow"), "demo")).toBe(true);
		expect(exemptionMatches(ex, finding("banned"), "demo")).toBe(false);
	});

	it("matches any rule with '*'", () => {
		const ex: PolicyExemption = { rule: "*", reason: "x" };
		expect(exemptionMatches(ex, finding("banned"), "demo")).toBe(true);
	});

	it("scopes to a skill glob when skill is set", () => {
		const ex: PolicyExemption = { rule: "*", reason: "x", skill: "legacy-*" };
		expect(exemptionMatches(ex, finding("banned"), "legacy-tool")).toBe(true);
		expect(exemptionMatches(ex, finding("banned"), "modern-tool")).toBe(false);
	});

	it("does not match a skill-scoped exemption when the finding has no skill", () => {
		const ex: PolicyExemption = { rule: "*", reason: "x", skill: "legacy-*" };
		expect(exemptionMatches(ex, finding("banned"), undefined)).toBe(false);
	});
});

describe("applyExemptions", () => {
	const fileToSkill = new Map([["skills/demo/SKILL.md", "demo"]]);

	it("returns all findings unchanged with no exemptions", () => {
		const findings = [finding("banned")];
		const result = applyExemptions(findings, undefined, fileToSkill, NOW);
		expect(result.kept).toHaveLength(1);
		expect(result.exempted).toHaveLength(0);
	});

	it("partitions findings by active exemption", () => {
		const findings = [finding("banned"), finding("sources.allow")];
		const exemptions: PolicyExemption[] = [{ rule: "banned", reason: "approved" }];
		const result = applyExemptions(findings, exemptions, fileToSkill, NOW);
		expect(result.exempted.map((f) => f.rule)).toEqual(["banned"]);
		expect(result.kept.map((f) => f.rule)).toEqual(["sources.allow"]);
	});

	it("does not suppress with an expired exemption and reports it as expired", () => {
		const findings = [finding("banned")];
		const exemptions: PolicyExemption[] = [
			{ rule: "banned", reason: "lapsed", expires: "2026-01-01" },
		];
		const result = applyExemptions(findings, exemptions, fileToSkill, NOW);
		expect(result.kept).toHaveLength(1);
		expect(result.exempted).toHaveLength(0);
		expect(result.expired).toHaveLength(1);
	});
});
