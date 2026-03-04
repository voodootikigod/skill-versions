import { describe, expect, it } from "vitest";
import { generateStarterPolicy } from "./init.js";
import { parsePolicy, validatePolicy } from "./parser.js";

describe("generateStarterPolicy", () => {
	it("generates non-empty YAML", () => {
		const yaml = generateStarterPolicy();
		expect(yaml.length).toBeGreaterThan(0);
		expect(yaml).toContain("version: 1");
	});

	it("generates parseable YAML", async () => {
		const yaml = generateStarterPolicy();
		const policy = await parsePolicy(yaml);
		expect(policy.version).toBe(1);
	});

	it("generates a valid policy", async () => {
		const yaml = generateStarterPolicy();
		const policy = await parsePolicy(yaml);
		const errors = validatePolicy(policy);
		expect(errors).toEqual([]);
	});

	it("contains commented examples for all sections", () => {
		const yaml = generateStarterPolicy();
		expect(yaml).toContain("sources:");
		expect(yaml).toContain("required:");
		expect(yaml).toContain("banned:");
		expect(yaml).toContain("metadata:");
		expect(yaml).toContain("content:");
		expect(yaml).toContain("freshness:");
		expect(yaml).toContain("audit:");
	});

	it("includes common defaults", () => {
		const yaml = generateStarterPolicy();
		expect(yaml).toContain("max_age_days: 90");
		expect(yaml).toContain("require_clean: false");
	});
});
