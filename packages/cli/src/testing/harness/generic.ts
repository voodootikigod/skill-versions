import { exec } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { AgentExecution } from "../types.js";
import type { AgentHarness } from "./interface.js";

/**
 * List all files in a directory recursively.
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
 * Generic shell-based agent harness.
 * Uses a configurable command template where {prompt} is replaced with the actual prompt.
 */
export class GenericHarness implements AgentHarness {
	readonly name = "generic";
	private readonly commandTemplate: string;

	constructor(commandTemplate?: string) {
		this.commandTemplate = commandTemplate ?? 'echo "{prompt}"';
	}

	// biome-ignore lint/suspicious/useAwait: interface contract requires async
	async available(): Promise<boolean> {
		return true; // Shell is always available
	}

	async execute(
		prompt: string,
		options: { workDir: string; timeout: number; skills?: string[] }
	): Promise<AgentExecution> {
		const beforeFiles = await listFilesRecursive(options.workDir);
		const start = Date.now();

		// Replace {prompt} placeholder with the actual prompt, escaping shell characters
		const escapedPrompt = prompt.replace(/'/g, "'\\''");
		const command = this.commandTemplate.replace("{prompt}", escapedPrompt);

		const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
			(resolve) => {
				exec(
					command,
					{
						cwd: options.workDir,
						timeout: options.timeout * 1000,
						maxBuffer: 10 * 1024 * 1024,
					},
					(error, stdout, stderr) => {
						resolve({
							exitCode: error ? ((error as { code?: number }).code ?? 1) : 0,
							stdout: stdout ?? "",
							stderr: stderr ?? "",
						});
					}
				);
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
