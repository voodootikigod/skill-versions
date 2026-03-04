import { describe, expect, it } from "vitest";
import type { CheckContext, ExtractedPackage } from "../types.js";
import { advisoryChecker } from "./advisory.js";

function makeContext(packages: ExtractedPackage[]): CheckContext {
	return {
		file: { path: "test/SKILL.md", frontmatter: {}, content: "", raw: "" },
		packages,
		commands: [],
		urls: [],
	};
}

function pkg(name: string, ecosystem: "npm" | "pypi" | "crates", line = 1): ExtractedPackage {
	return { name, ecosystem, line, source: `install ${name}` };
}

describe("advisoryChecker", () => {
	it("flags known hallucinated npm packages", async () => {
		const ctx = makeContext([pkg("react-codeshift", "npm")]);
		const findings = await advisoryChecker.check(ctx);
		expect(findings).toHaveLength(1);
		expect(findings[0].severity).toBe("critical");
		expect(findings[0].category).toBe("advisory-match");
		expect(findings[0].message).toContain("known hallucinated");
	});

	it("flags known hallucinated PyPI packages", async () => {
		const ctx = makeContext([pkg("huggingface-cli", "pypi")]);
		const findings = await advisoryChecker.check(ctx);
		expect(findings).toHaveLength(1);
		expect(findings[0].category).toBe("advisory-match");
	});

	it("flags known hallucinated crates", async () => {
		const ctx = makeContext([pkg("rust-web-framework", "crates")]);
		const findings = await advisoryChecker.check(ctx);
		expect(findings).toHaveLength(1);
	});

	it("passes for legitimate packages", async () => {
		const ctx = makeContext([
			pkg("express", "npm"),
			pkg("requests", "pypi"),
			pkg("serde", "crates"),
		]);
		const findings = await advisoryChecker.check(ctx);
		expect(findings).toHaveLength(0);
	});

	it("preserves line numbers", async () => {
		const ctx = makeContext([pkg("react-codeshift", "npm", 42)]);
		const findings = await advisoryChecker.check(ctx);
		expect(findings[0].line).toBe(42);
	});

	it("reports multiple matches", async () => {
		const ctx = makeContext([pkg("react-codeshift", "npm", 3), pkg("huggingface-cli", "pypi", 10)]);
		const findings = await advisoryChecker.check(ctx);
		expect(findings).toHaveLength(2);
	});
});
