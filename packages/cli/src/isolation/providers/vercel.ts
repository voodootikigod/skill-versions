import { execFile } from "node:child_process";
import type { IsolationExecuteOptions, IsolationProvider, IsolationResult } from "../types.js";

function commandExists(cmd: string): Promise<boolean> {
	return new Promise((resolve) => {
		const whichCmd = process.platform === "win32" ? "where" : "which";
		execFile(whichCmd, [cmd], (error) => resolve(!error));
	});
}

/**
 * Vercel Sandbox provider.
 * Runs skills-check commands in a Vercel ephemeral sandbox environment.
 * Requires either VERCEL_TOKEN env var or an authenticated `vercel` CLI.
 */
export class VercelSandboxProvider implements IsolationProvider {
	readonly name = "vercel-sandbox" as const;
	readonly isFallback = false;

	async available(): Promise<boolean> {
		// Check for explicit token first
		if (process.env.VERCEL_TOKEN) {
			return true;
		}

		// Fall back to checking for authenticated CLI
		if (!(await commandExists("vercel"))) {
			return false;
		}

		return new Promise((resolve) => {
			execFile("vercel", ["whoami"], { timeout: 5000 }, (error) => resolve(!error));
		});
	}

	async execute(options: IsolationExecuteOptions): Promise<IsolationResult> {
		const fullCommand = `npx skills-check ${options.command}`;

		// Build env flags for the sandbox
		const envFlags: string[] = [];
		if (options.env) {
			for (const [key, value] of Object.entries(options.env)) {
				envFlags.push("--env", `${key}=${value}`);
			}
		}

		// Use Vercel's sandbox execution API via the CLI
		const args = [
			"sandbox",
			"exec",
			...envFlags,
			"--timeout",
			String(options.timeout * 1000),
			"--",
			"sh",
			"-c",
			fullCommand,
		];

		const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
			(resolve) => {
				execFile(
					"vercel",
					args,
					{
						cwd: options.skillsDir,
						timeout: (options.timeout + 30) * 1000, // Extra buffer for sandbox startup
						maxBuffer: 10 * 1024 * 1024,
						env: {
							...process.env,
							...options.env,
							...(process.env.VERCEL_TOKEN ? { VERCEL_TOKEN: process.env.VERCEL_TOKEN } : {}),
						},
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

		return {
			...result,
			provider: this.name,
		};
	}
}
