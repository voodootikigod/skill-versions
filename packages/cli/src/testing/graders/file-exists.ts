import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { GraderResult } from "../types.js";

/**
 * Check that specific files exist in the work directory.
 */
export async function gradeFileExists(workDir: string, paths: string[]): Promise<GraderResult> {
	const missing: string[] = [];
	const found: string[] = [];

	for (const p of paths) {
		const fullPath = join(workDir, p);
		try {
			const info = await stat(fullPath);
			if (info.isFile() || info.isDirectory()) {
				found.push(p);
			} else {
				missing.push(p);
			}
		} catch {
			missing.push(p);
		}
	}

	if (missing.length === 0) {
		return {
			grader: "file-exists",
			passed: true,
			message: `All ${paths.length} expected file(s) exist`,
		};
	}

	return {
		grader: "file-exists",
		passed: false,
		message: `Missing ${missing.length} of ${paths.length} expected file(s)`,
		detail: `Missing: ${missing.join(", ")}`,
	};
}
