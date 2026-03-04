import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadIgnoreRules, shouldIgnore } from "./ignore.js";
import type { AuditFinding } from "./types.js";

function makeFinding(overrides?: Partial<AuditFinding>): AuditFinding {
	return {
		file: "skills/test/SKILL.md",
		line: 5,
		severity: "critical",
		category: "hallucinated-package",
		message: "Package not found",
		evidence: "bad-pkg",
		...overrides,
	};
}

describe("loadIgnoreRules", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "ignore-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it("returns empty array when file does not exist", async () => {
		const rules = await loadIgnoreRules(join(tempDir, ".skillsafeignore"));
		expect(rules).toHaveLength(0);
	});

	it("parses category-only rules", async () => {
		const path = join(tempDir, ".skillsafeignore");
		await writeFile(path, "hallucinated-package\nprompt-injection\n", "utf-8");
		const rules = await loadIgnoreRules(path);
		expect(rules).toHaveLength(2);
		expect(rules[0]).toEqual({ category: "hallucinated-package" });
		expect(rules[1]).toEqual({ category: "prompt-injection" });
	});

	it("parses category:file rules", async () => {
		const path = join(tempDir, ".skillsafeignore");
		await writeFile(path, "prompt-injection:skills/foo/", "utf-8");
		const rules = await loadIgnoreRules(path);
		expect(rules).toHaveLength(1);
		expect(rules[0]).toEqual({ category: "prompt-injection", file: "skills/foo/" });
	});

	it("skips comments and blank lines", async () => {
		const path = join(tempDir, ".skillsafeignore");
		await writeFile(path, "# comment\n\nhallucinated-package\n", "utf-8");
		const rules = await loadIgnoreRules(path);
		expect(rules).toHaveLength(1);
	});
});

describe("shouldIgnore", () => {
	it("ignores findings matching category rule", () => {
		const rules = [{ category: "hallucinated-package" as const }];
		const finding = makeFinding();
		expect(shouldIgnore(finding, rules, "")).toBe(true);
	});

	it("does not ignore findings not matching category", () => {
		const rules = [{ category: "prompt-injection" as const }];
		const finding = makeFinding({ category: "hallucinated-package" });
		expect(shouldIgnore(finding, rules, "")).toBe(false);
	});

	it("ignores findings matching category and file pattern", () => {
		const rules = [{ category: "hallucinated-package" as const, file: "skills/test/" }];
		const finding = makeFinding({ file: "skills/test/SKILL.md" });
		expect(shouldIgnore(finding, rules, "")).toBe(true);
	});

	it("does not ignore when file pattern does not match", () => {
		const rules = [{ category: "hallucinated-package" as const, file: "skills/other/" }];
		const finding = makeFinding({ file: "skills/test/SKILL.md" });
		expect(shouldIgnore(finding, rules, "")).toBe(false);
	});

	it("ignores via inline audit-ignore comment", () => {
		const raw = "line 1\n<!-- audit-ignore -->\nnpm install bad-pkg\nline 4";
		const finding = makeFinding({ line: 3 });
		expect(shouldIgnore(finding, [], raw)).toBe(true);
	});

	it("ignores via inline audit-ignore with specific category", () => {
		const raw = "line 1\n<!-- audit-ignore: hallucinated-package -->\nnpm install bad-pkg";
		const finding = makeFinding({ line: 3, category: "hallucinated-package" });
		expect(shouldIgnore(finding, [], raw)).toBe(true);
	});

	it("does not ignore when inline category does not match", () => {
		const raw = "line 1\n<!-- audit-ignore: prompt-injection -->\nnpm install bad-pkg";
		const finding = makeFinding({ line: 3, category: "hallucinated-package" });
		expect(shouldIgnore(finding, [], raw)).toBe(false);
	});

	it("does not ignore without any rules or comments", () => {
		const raw = "line 1\nline 2\nnpm install bad-pkg";
		const finding = makeFinding({ line: 3 });
		expect(shouldIgnore(finding, [], raw)).toBe(false);
	});
});
