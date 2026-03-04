import { describe, expect, it } from "vitest";
import type { CheckContext } from "../types.js";
import { metadataChecker } from "./metadata.js";

function makeContext(frontmatter: Record<string, unknown>): CheckContext {
	return {
		file: { path: "test/SKILL.md", frontmatter, content: "", raw: "" },
		packages: [],
		commands: [],
		urls: [],
	};
}

describe("metadataChecker", () => {
	it("passes with all required fields", async () => {
		const ctx = makeContext({
			name: "my-skill",
			description: "A useful skill",
			"product-version": "1.0.0",
			version: "1.0",
			author: "test",
		});
		const findings = await metadataChecker.check(ctx);
		expect(findings).toHaveLength(0);
	});

	it("reports missing name as medium", async () => {
		const ctx = makeContext({
			description: "A skill",
			"product-version": "1.0.0",
		});
		const findings = await metadataChecker.check(ctx);
		const nameFinding = findings.find((f) => f.message.includes("name"));
		expect(nameFinding).toBeDefined();
		expect(nameFinding?.severity).toBe("medium");
	});

	it("reports missing description as medium", async () => {
		const ctx = makeContext({
			name: "my-skill",
			"product-version": "1.0.0",
		});
		const findings = await metadataChecker.check(ctx);
		const descFinding = findings.find((f) => f.message.includes("description"));
		expect(descFinding).toBeDefined();
		expect(descFinding?.severity).toBe("medium");
	});

	it("reports missing product-version as medium", async () => {
		const ctx = makeContext({
			name: "my-skill",
			description: "A skill",
		});
		const findings = await metadataChecker.check(ctx);
		const versionFinding = findings.find((f) => f.message.includes("product-version"));
		expect(versionFinding).toBeDefined();
		expect(versionFinding?.severity).toBe("medium");
	});

	it("reports missing recommended fields as low", async () => {
		const ctx = makeContext({
			name: "my-skill",
			description: "A skill",
			"product-version": "1.0.0",
		});
		const findings = await metadataChecker.check(ctx);
		expect(findings.every((f) => f.severity === "low")).toBe(true);
		expect(findings.length).toBe(2); // version and author
	});

	it("reports empty string fields as missing", async () => {
		const ctx = makeContext({
			name: "",
			description: "A skill",
			"product-version": "1.0.0",
		});
		const findings = await metadataChecker.check(ctx);
		const nameFinding = findings.find((f) => f.message.includes("name"));
		expect(nameFinding).toBeDefined();
	});

	it("reports all missing fields for empty frontmatter", async () => {
		const ctx = makeContext({});
		const findings = await metadataChecker.check(ctx);
		// 3 required (medium) + 2 recommended (low) = 5
		expect(findings).toHaveLength(5);
	});

	it("uses correct category", async () => {
		const ctx = makeContext({});
		const findings = await metadataChecker.check(ctx);
		expect(findings.every((f) => f.category === "metadata-incomplete")).toBe(true);
	});
});
