import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { GraderResult } from "../types.js";

/**
 * Check that package.json contains specific dependencies and/or devDependencies.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
export async function gradePackageHas(
	workDir: string,
	deps?: string[],
	devDeps?: string[]
): Promise<GraderResult> {
	const pkgPath = join(workDir, "package.json");
	let content: string;

	try {
		content = await readFile(pkgPath, "utf-8");
	} catch {
		return {
			grader: "package-has",
			passed: false,
			message: "Could not read package.json",
		};
	}

	let pkg: Record<string, unknown>;
	try {
		pkg = JSON.parse(content) as Record<string, unknown>;
	} catch {
		return {
			grader: "package-has",
			passed: false,
			message: "package.json is not valid JSON",
		};
	}

	const missing: string[] = [];

	if (deps && deps.length > 0) {
		const actual = (pkg.dependencies ?? {}) as Record<string, unknown>;
		for (const dep of deps) {
			if (!(dep in actual)) {
				missing.push(`dependencies.${dep}`);
			}
		}
	}

	if (devDeps && devDeps.length > 0) {
		const actual = (pkg.devDependencies ?? {}) as Record<string, unknown>;
		for (const dep of devDeps) {
			if (!(dep in actual)) {
				missing.push(`devDependencies.${dep}`);
			}
		}
	}

	const totalChecked = (deps?.length ?? 0) + (devDeps?.length ?? 0);

	if (missing.length === 0) {
		return {
			grader: "package-has",
			passed: true,
			message: `All ${totalChecked} expected dependency/devDependency entries found`,
		};
	}

	return {
		grader: "package-has",
		passed: false,
		message: `Missing ${missing.length} of ${totalChecked} expected entries in package.json`,
		detail: `Missing: ${missing.join(", ")}`,
	};
}
