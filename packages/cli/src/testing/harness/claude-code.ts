import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { AgentExecution } from "../types.js";
import type { AgentHarness } from "./interface.js";

/**
 * Run `which` (or `where` on Windows) to detect if a command is available.
 */
function commandExists(cmd: string): Promise<boolean> {
	return new Promise((resolve) => {
		const whichCmd = process.platform === "win32" ? "where" : "which";
		execFile(whichCmd, [cmd], (error) => {
			resolve(!error);
		});
	});
}

/**
 * List all files in a directory recursively (for diffing before/after).
 */
async function listFilesRecursive(dir: string): Promise<Set<string>> {
	const files = new Set<string>();

	async function walk(d: string) {
		let entries: string[];
		try {
			entries = await readdir(d);
		} catch {
			return;
		}
		for (const entry of entries) {
			const fullPath = join(d, entry);
			const { stat } = await import("node:fs/promises");
			try {
				const info = await stat(fullPath);
				if (info.isDirectory()) {
					await walk(fullPath);
				} else {
					files.add(fullPath);
				}
			} catch {
				// skip inaccessible
			}
		}
	}

	await walk(dir);
	return files;
}

/**
 * Agent harness for Claude Code CLI.
 * Uses `claude --print --dangerously-skip-permissions` to execute prompts.
 */
export class ClaudeCodeHarness implements AgentHarness {
	name = "claude-code";

	// biome-ignore lint/suspicious/useAwait: interface contract requires async
	async available(): Promise<boolean> {
		return commandExists("claude");
	}

	async execute(
		prompt: string,
		options: { workDir: string; timeout: number; skills?: string[] }
	): Promise<AgentExecution> {
		const beforeFiles = await listFilesRecursive(options.workDir);
		const start = Date.now();

		const args = ["--print", "--dangerously-skip-permissions", prompt];

		const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
			(resolve) => {
				const child = execFile(
					"claude",
					args,
					{
						cwd: options.workDir,
						timeout: options.timeout * 1000,
						maxBuffer: 10 * 1024 * 1024,
					},
					(error, stdout, stderr) => {
						resolve({
							exitCode: error
								? ((error as NodeJS.ErrnoException & { code?: number }).code ?? 1)
								: 0,
							stdout: stdout ?? "",
							stderr: stderr ?? "",
						});
					}
				);

				// Handle timeout via AbortSignal if timeout fires
				if (child.pid) {
					setTimeout(() => {
						try {
							child.kill("SIGTERM");
						} catch {
							// already dead
						}
					}, options.timeout * 1000);
				}
			}
		);

		const duration = Date.now() - start;
		const afterFiles = await listFilesRecursive(options.workDir);
		const filesCreated = [...afterFiles].filter((f) => !beforeFiles.has(f));

		return {
			exitCode: result.exitCode,
			transcript: result.stdout,
			filesCreated,
			duration,
		};
	}
}
