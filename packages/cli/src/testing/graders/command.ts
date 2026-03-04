import { exec } from "node:child_process";
import type { GraderResult } from "../types.js";

/**
 * Run a shell command in the work directory and check its exit code.
 */
export async function gradeCommand(
	workDir: string,
	run: string,
	expectExit: number
): Promise<GraderResult> {
	try {
		const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
			(resolve) => {
				exec(
					run,
					{
						cwd: workDir,
						timeout: 30_000,
						maxBuffer: 5 * 1024 * 1024,
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

		if (result.exitCode === expectExit) {
			return {
				grader: "command",
				passed: true,
				message: `Command '${run}' exited with expected code ${expectExit}`,
			};
		}

		return {
			grader: "command",
			passed: false,
			message: `Command '${run}' exited with code ${result.exitCode}, expected ${expectExit}`,
			detail: result.stderr || result.stdout || undefined,
		};
	} catch (error) {
		return {
			grader: "command",
			passed: false,
			message: `Command '${run}' failed to execute`,
			detail: error instanceof Error ? error.message : String(error),
		};
	}
}
