import { describe, expect, it } from "vitest";
import type { SkillFile } from "../../skill-io.js";
import { checkConditional } from "./conditional.js";

function makeFile(frontmatter: Record<string, unknown>, content: string): SkillFile {
	return {
		path: "test/SKILL.md",
		frontmatter,
		content,
		raw: `---\n---\n${content}`,
	};
}

describe("checkConditional", () => {
	it("warns about missing product-version when product references exist", () => {
		const file = makeFile({}, "Run `npm install express` to get started.");
		const findings = checkConditional(file);
		const pvFinding = findings.find((f) => f.field === "product-version");
		expect(pvFinding).toBeDefined();
		expect(pvFinding?.level).toBe("warning");
	});

	it("does not warn about product-version when it is present", () => {
		const file = makeFile(
			{ "product-version": "4.18.0" },
			"Run `npm install express` to get started."
		);
		const findings = checkConditional(file);
		const pvFinding = findings.find((f) => f.field === "product-version");
		expect(pvFinding).toBeUndefined();
	});

	it("does not warn about product-version for generic content", () => {
		const file = makeFile({}, "This skill provides general coding best practices.");
		const findings = checkConditional(file);
		expect(findings.filter((f) => f.field === "product-version")).toHaveLength(0);
	});

	it("warns about missing agents when agent-specific content exists", () => {
		const file = makeFile({}, "In Claude Code, use the /add command.");
		const findings = checkConditional(file);
		const agentsFinding = findings.find((f) => f.field === "agents");
		expect(agentsFinding).toBeDefined();
		expect(agentsFinding?.level).toBe("warning");
	});

	it("does not warn about agents when agents field is present", () => {
		const file = makeFile({ agents: ["claude-code"] }, "In Claude Code, use the /add command.");
		const findings = checkConditional(file);
		const agentsFinding = findings.find((f) => f.field === "agents");
		expect(agentsFinding).toBeUndefined();
	});

	it("does not warn about agents for generic content", () => {
		const file = makeFile({}, "This skill covers general patterns.");
		const findings = checkConditional(file);
		expect(findings.filter((f) => f.field === "agents")).toHaveLength(0);
	});

	it("marks all findings as not fixable", () => {
		const file = makeFile({}, "In Claude Code, run `npm install express` to get started.");
		const findings = checkConditional(file);
		for (const f of findings) {
			expect(f.fixable).toBe(false);
		}
	});
});
