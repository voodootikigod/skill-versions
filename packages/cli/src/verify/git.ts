import { execFile } from "node:child_process";
import { relative } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Get the git repository root directory for the given path.
 * Returns null if not inside a git repo.
 */
async function getRepoRoot(cwd: string): Promise<string | null> {
	try {
		const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], { cwd });
		return stdout.trim();
	} catch {
		return null;
	}
}

/**
 * Get the previous committed version of a file from git history.
 *
 * Uses `git log` to find the last commit that touched the file, then
 * `git show` to retrieve the content at the commit before that one.
 * Returns null if the file has no git history, is new, or we're not in a git repo.
 */
export async function getPreviousVersion(filePath: string): Promise<string | null> {
	const repoRoot = await getRepoRoot(filePath.substring(0, filePath.lastIndexOf("/")));
	if (!repoRoot) {
		return null;
	}

	const relativePath = relative(repoRoot, filePath);
	if (!relativePath || relativePath.startsWith("..")) {
		return null;
	}

	try {
		// Find the most recent commit that modified this file, then skip it
		// to get the previous version
		const { stdout: commitHash } = await execFileAsync(
			"git",
			["log", "--follow", "-1", "--skip=1", "--format=%H", "--", relativePath],
			{ cwd: repoRoot }
		);

		const hash = commitHash.trim();
		if (!hash) {
			// File has only one commit or none — try HEAD~1 as fallback
			try {
				const { stdout: content } = await execFileAsync("git", ["show", `HEAD~1:${relativePath}`], {
					cwd: repoRoot,
				});
				return content;
			} catch {
				return null;
			}
		}

		const { stdout: content } = await execFileAsync("git", ["show", `${hash}:${relativePath}`], {
			cwd: repoRoot,
		});
		return content;
	} catch {
		return null;
	}
}
