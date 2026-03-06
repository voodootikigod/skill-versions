import { execFile } from "node:child_process";
import type { IsolationExecuteOptions, IsolationProvider, IsolationResult } from "../types.js";

function commandExists(cmd: string): Promise<boolean> {
	return new Promise((resolve) => {
		const whichCmd = process.platform === "win32" ? "where" : "which";
		execFile(whichCmd, [cmd], (error) => resolve(!error));
	});
}

/**
 * Apple Containers provider for macOS 26+.
 * Uses `containerctl` to run skills-check commands in a lightweight Linux container.
 */
export class AppleContainerProvider implements IsolationProvider {
	readonly name = "apple-container" as const;
	readonly isFallback = false;

	// biome-ignore lint/suspicious/useAwait: interface contract requires async
	async available(): Promise<boolean> {
		if (process.platform !== "darwin") {
			return false;
		}
		return commandExists("containerctl");
	}

	async execute(options: IsolationExecuteOptions): Promise<IsolationResult> {
		const fullCommand = `npx skills-check ${options.command}`;
		const args = [
			"run",
			"--name",
			`skills-check-${Date.now()}`,
			"--mount",
			`type=bind,source=${options.skillsDir},target=/skills,readonly`,
		];

		if (options.workDir) {
			args.push("--mount", `type=bind,source=${options.workDir},target=/work`);
		}

		if (!options.networkAccess) {
			args.push("--network", "none");
		}

		// Forward environment variables
		if (options.env) {
			for (const [key, value] of Object.entries(options.env)) {
				args.push("--env", `${key}=${value}`);
			}
		}

		args.push("--", "sh", "-c", `cd /skills && ${fullCommand}`);

		const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
			(resolve) => {
				execFile(
					"containerctl",
					args,
					{
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

		return {
			...result,
			provider: this.name,
		};
	}
}
