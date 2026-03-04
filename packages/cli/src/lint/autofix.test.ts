import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SkillFile } from "../skill-io.js";
import type { LintFinding } from "./types.js";

// Mock child_process.execFile to avoid real git calls
vi.mock("node:child_process", () => ({
	execFile: vi.fn(),
}));

import { execFile } from "node:child_process";
import { autofix } from "./autofix.js";

const mockedExecFile = vi.mocked(execFile);

// biome-ignore lint/complexity/noBannedTypes: test mock callback requires loose typing
type ExecCallback = Function;

function makeFile(frontmatter: Record<string, unknown>): SkillFile {
	return {
		path: "test/SKILL.md",
		frontmatter,
		content: "\nSome content here.\n",
		raw: "---\n---\nSome content here.\n",
	};
}

function makeFinding(field: string, fixable = true): LintFinding {
	return {
		file: "test/SKILL.md",
		field,
		level: "error",
		message: `Missing field: ${field}`,
		fixable,
	};
}

describe("autofix", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default: mock git commands to succeed
		mockedExecFile.mockImplementation((_cmd, args, _opts, callback) => {
			const cb = typeof _opts === "function" ? _opts : callback;
			const argsArr = args as string[];
			if (argsArr.includes("user.name")) {
				(cb as ExecCallback)(null, { stdout: "Test Author\n", stderr: "" });
			} else if (argsArr.includes("get-url")) {
				(cb as ExecCallback)(null, {
					stdout: "https://github.com/test/repo\n",
					stderr: "",
				});
			} else {
				(cb as ExecCallback)(null, { stdout: "", stderr: "" });
			}
			return {} as ReturnType<typeof execFile>;
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns null when no findings are fixable", async () => {
		const file = makeFile({});
		const findings = [makeFinding("name", false)];
		const result = await autofix(file, findings);
		expect(result).toBeNull();
	});

	it("returns null when no findings match the file", async () => {
		const file = makeFile({});
		const findings: LintFinding[] = [
			{
				file: "other/SKILL.md",
				field: "author",
				level: "error",
				message: "Missing author",
				fixable: true,
			},
		];
		const result = await autofix(file, findings);
		expect(result).toBeNull();
	});

	it("fixes author from git config", async () => {
		const file = makeFile({});
		const findings = [makeFinding("author")];
		const result = await autofix(file, findings);
		expect(result).not.toBeNull();
		expect(result?.fixed).toContain("author");
		expect(result?.content).toContain("author: Test Author");
	});

	it("fixes repository from git remote", async () => {
		const file = makeFile({});
		const findings = [makeFinding("repository")];
		const result = await autofix(file, findings);
		expect(result).not.toBeNull();
		expect(result?.fixed).toContain("repository");
		expect(result?.content).toContain("repository: 'https://github.com/test/repo'");
	});

	it("fixes license with MIT default", async () => {
		const file = makeFile({});
		const findings = [makeFinding("license")];
		const result = await autofix(file, findings);
		expect(result).not.toBeNull();
		expect(result?.fixed).toContain("license");
		expect(result?.content).toContain("license: MIT");
	});

	it("fixes multiple fields at once", async () => {
		const file = makeFile({});
		const findings = [makeFinding("author"), makeFinding("license"), makeFinding("repository")];
		const result = await autofix(file, findings);
		expect(result).not.toBeNull();
		expect(result?.fixed).toHaveLength(3);
		expect(result?.fixed.sort()).toEqual(["author", "license", "repository"]);
	});

	it("preserves existing frontmatter fields", async () => {
		const file = makeFile({ name: "my-skill" });
		const findings = [makeFinding("author")];
		const result = await autofix(file, findings);
		expect(result).not.toBeNull();
		expect(result?.content).toContain("name: my-skill");
		expect(result?.content).toContain("author: Test Author");
	});

	it("returns null when git commands fail and no license fix needed", async () => {
		mockedExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
			const cb = typeof _opts === "function" ? _opts : callback;
			(cb as ExecCallback)(new Error("git not found"), { stdout: "", stderr: "" });
			return {} as ReturnType<typeof execFile>;
		});

		const file = makeFile({});
		const findings = [makeFinding("author")];
		const result = await autofix(file, findings);
		expect(result).toBeNull();
	});
});
