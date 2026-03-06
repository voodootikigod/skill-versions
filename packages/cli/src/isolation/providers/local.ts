import { exec } from "node:child_process";
import type { IsolationExecuteOptions, IsolationProvider, IsolationResult } from "../types.js";

/**
 * Local passthrough provider — runs the command directly in the current process.
 * No isolation. Used as the final fallback when no container runtime is available.
 */
export class LocalProvider implements IsolationProvider {
	readonly name = "local" as const;
	readonly isFallback: boolean;

	constructor(isFallback = false) {
		this.isFallback = isFallback;
	}

	// biome-ignore lint/suspicious/useAwait: interface contract
	async available(): Promise<boolean> {
		return true;
	}

	async execute(options: IsolationExecuteOptions): Promise<IsolationResult> {
		const fullCommand = `npx skills-check ${options.command}`;

		const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
			(resolve) => {
				exec(
					fullCommand,
					{
						cwd: options.skillsDir,
						timeout: options.timeout * 1000,
						maxBuffer: 10 * 1024 * 1024,
						env: { ...process.env, ...options.env },
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
