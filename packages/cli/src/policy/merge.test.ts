import { describe, expect, it } from "vitest";
import { mergePolicies } from "./merge.js";
import type { SkillPolicy } from "./types.js";

describe("mergePolicies", () => {
	it("unions source allow/deny lists and dedupes", () => {
		const base: SkillPolicy = { version: 1, sources: { allow: ["@acme/*"], deny: ["evil/*"] } };
		const child: SkillPolicy = {
			version: 1,
			sources: { allow: ["@acme/*", "@team/*"], deny: ["bad/*"] },
		};
		const merged = mergePolicies(base, child);
		expect(merged.sources?.allow).toEqual(["@acme/*", "@team/*"]);
		expect(merged.sources?.deny).toEqual(["evil/*", "bad/*"]);
	});

	it("accumulates banned skills and dedupes by name", () => {
		const base: SkillPolicy = { version: 1, banned: [{ skill: "yolo", reason: "base" }] };
		const child: SkillPolicy = {
			version: 1,
			banned: [{ skill: "yolo", reason: "child" }, { skill: "danger" }],
		};
		const merged = mergePolicies(base, child);
		expect(merged.banned).toHaveLength(2);
		// First occurrence (base) wins on dedupe.
		expect(merged.banned?.find((b) => b.skill === "yolo")?.reason).toBe("base");
	});

	it("lets the child override scalar audit/freshness flags", () => {
		const base: SkillPolicy = {
			version: 1,
			audit: { require_clean: true, min_severity_to_block: "high" },
			freshness: { max_age_days: 90 },
		};
		const child: SkillPolicy = {
			version: 1,
			audit: { min_severity_to_block: "critical" },
			freshness: { max_age_days: 30 },
		};
		const merged = mergePolicies(base, child);
		expect(merged.audit?.require_clean).toBe(true); // inherited
		expect(merged.audit?.min_severity_to_block).toBe("critical"); // overridden
		expect(merged.freshness?.max_age_days).toBe(30);
	});

	it("concatenates content patterns and exemptions", () => {
		const base: SkillPolicy = {
			version: 1,
			content: { deny_patterns: [{ pattern: "a", reason: "base" }] },
			exemptions: [{ rule: "sources.allow", reason: "base waiver" }],
		};
		const child: SkillPolicy = {
			version: 1,
			content: { deny_patterns: [{ pattern: "b", reason: "child" }] },
			exemptions: [{ rule: "banned", reason: "child waiver" }],
		};
		const merged = mergePolicies(base, child);
		expect(merged.content?.deny_patterns).toHaveLength(2);
		expect(merged.exemptions).toHaveLength(2);
	});

	it("never carries the extends field into the result", () => {
		const base: SkillPolicy = { version: 1, sources: { allow: ["@a/*"] } };
		const child: SkillPolicy = { version: 1, extends: "./base.yml" };
		const merged = mergePolicies(base, child);
		expect(merged.extends).toBeUndefined();
	});
});
