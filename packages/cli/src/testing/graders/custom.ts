import type { GraderResult } from "../types.js";

/**
 * Load and execute a custom grader module.
 * The module should export a `grade(context)` function that returns a GraderResult.
 */
export async function gradeCustom(workDir: string, modulePath: string): Promise<GraderResult> {
	try {
		const mod = (await import(modulePath)) as {
			grade?: (context: { workDir: string }) => GraderResult | Promise<GraderResult>;
		};

		if (typeof mod.grade !== "function") {
			return {
				grader: "custom",
				passed: false,
				message: `Custom grader module "${modulePath}" does not export a grade() function`,
			};
		}

		const result = await mod.grade({ workDir });

		return {
			grader: "custom",
			passed: result.passed,
			message: result.message,
			detail: result.detail,
		};
	} catch (error) {
		return {
			grader: "custom",
			passed: false,
			message: `Custom grader "${modulePath}" failed to execute`,
			detail: error instanceof Error ? error.message : String(error),
		};
	}
}
