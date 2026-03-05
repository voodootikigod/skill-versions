import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { GraderResult } from "../types.js";
import { safePath } from "../safe-path.js";

/**
 * Check that a file contains (or does not contain) the given regex patterns.
 * When `negate` is true, checks that none of the patterns match (not-contains).
 */
export async function gradeContains(
	workDir: string,
	file: string,
	patterns: string[],
	negate?: boolean
): Promise<GraderResult> {
	const fullPath = safePath(resolve(workDir), file);
	let content: string;

	try {
		content = await readFile(fullPath, "utf-8");
	} catch {
		return {
			grader: negate ? "not-contains" : "contains",
			passed: false,
			message: `Could not read file: ${file}`,
		};
	}

	const failedPatterns: string[] = [];

	for (const pattern of patterns) {
		try {
			const regex = new RegExp(pattern);
			const matches = regex.test(content);

			if (negate && matches) {
				failedPatterns.push(pattern);
			} else if (!(negate || matches)) {
				failedPatterns.push(pattern);
			}
		} catch {
			failedPatterns.push(`${pattern} (invalid regex)`);
		}
	}

	if (failedPatterns.length === 0) {
		const verb = negate ? "absent from" : "found in";
		return {
			grader: negate ? "not-contains" : "contains",
			passed: true,
			message: `All ${patterns.length} pattern(s) ${verb} ${file}`,
		};
	}

	const verb = negate ? "unexpectedly found in" : "not found in";
	return {
		grader: negate ? "not-contains" : "contains",
		passed: false,
		message: `${failedPatterns.length} pattern(s) ${verb} ${file}`,
		detail: `Failed: ${failedPatterns.join(", ")}`,
	};
}
