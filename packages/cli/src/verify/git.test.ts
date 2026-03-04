import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock child_process.execFile before importing the module under test
vi.mock("node:child_process", () => {
	const mockExecFile = vi.fn();
	return {
		execFile: mockExecFile,
	};
});

import { execFile } from "node:child_process";
import { getPreviousVersion } from "./git.js";

// Cast to access mock functionality
const mockExecFile = vi.mocked(execFile);

type ExecFileCallback = (error: Error | null, result: { stdout: string; stderr: string }) => void;

function mockExecFileImpl(
	responses: Map<string, string>,
	errors?: Map<string, Error>
): (...args: unknown[]) => void {
	return (...args: unknown[]) => {
		const gitArgs = args[1] as string[];
		const callback = args.at(-1) as ExecFileCallback;

		// Build a key from the git arguments
		const key = gitArgs.join(" ");

		if (errors) {
			for (const [pattern, error] of errors) {
				if (key.includes(pattern)) {
					callback(error, { stdout: "", stderr: "" });
					return;
				}
			}
		}

		for (const [pattern, response] of responses) {
			if (key.includes(pattern)) {
				callback(null, { stdout: response, stderr: "" });
				return;
			}
		}

		callback(new Error(`Unexpected git call: git ${key}`), { stdout: "", stderr: "" });
	};
}

describe("getPreviousVersion", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns previous version content from git history", async () => {
		const previousContent = "---\nname: test\n---\n# Test v1\n";

		mockExecFile.mockImplementation(
			mockExecFileImpl(
				new Map([
					["--show-toplevel", "/repo\n"],
					["--follow", "abc123\n"],
					["show abc123:", previousContent],
				])
			) as typeof execFile
		);

		const result = await getPreviousVersion("/repo/skills/test/SKILL.md");
		expect(result).toBe(previousContent);
	});

	it("returns null when not in a git repo", async () => {
		mockExecFile.mockImplementation(
			mockExecFileImpl(
				new Map(),
				new Map([["--show-toplevel", new Error("not a git repository")]])
			) as typeof execFile
		);

		const result = await getPreviousVersion("/not-a-repo/SKILL.md");
		expect(result).toBeNull();
	});

	it("returns null when file has no git history", async () => {
		mockExecFile.mockImplementation(
			mockExecFileImpl(
				new Map([
					["--show-toplevel", "/repo\n"],
					["--follow", "\n"],
				]),
				new Map([["show HEAD~1:", new Error("path not found")]])
			) as typeof execFile
		);

		const result = await getPreviousVersion("/repo/skills/new/SKILL.md");
		expect(result).toBeNull();
	});

	it("falls back to HEAD~1 when only one commit exists", async () => {
		const content = "---\nname: test\n---\n# Test\n";

		mockExecFile.mockImplementation(
			mockExecFileImpl(
				new Map([
					["--show-toplevel", "/repo\n"],
					["--follow", "\n"],
					["show HEAD~1:", content],
				])
			) as typeof execFile
		);

		const result = await getPreviousVersion("/repo/skills/test/SKILL.md");
		expect(result).toBe(content);
	});

	it("handles paths with spaces correctly", async () => {
		const previousContent = "---\nname: test\n---\n# Test\n";

		mockExecFile.mockImplementation(
			mockExecFileImpl(
				new Map([
					["--show-toplevel", "/repo with spaces\n"],
					["--follow", "def456\n"],
					["show def456:", previousContent],
				])
			) as typeof execFile
		);

		const result = await getPreviousVersion("/repo with spaces/my skills/test/SKILL.md");
		expect(result).toBe(previousContent);
	});
});
