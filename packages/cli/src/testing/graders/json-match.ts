import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { GraderResult } from "../types.js";

/**
 * Parse a JSON file and validate its structure against an expected schema.
 * The schema is a simple object where keys are checked for existence and
 * value types are compared (string, number, boolean, object, array).
 */
export async function gradeJsonMatch(
	workDir: string,
	file: string,
	schema: Record<string, unknown>
): Promise<GraderResult> {
	const fullPath = join(workDir, file);
	let content: string;

	try {
		content = await readFile(fullPath, "utf-8");
	} catch {
		return {
			grader: "json-match",
			passed: false,
			message: `Could not read file: ${file}`,
		};
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		return {
			grader: "json-match",
			passed: false,
			message: `File ${file} is not valid JSON`,
		};
	}

	if (typeof parsed !== "object" || parsed === null) {
		return {
			grader: "json-match",
			passed: false,
			message: `File ${file} is not a JSON object`,
		};
	}

	const errors: string[] = [];
	validateStructure(parsed as Record<string, unknown>, schema, "", errors);

	if (errors.length === 0) {
		return {
			grader: "json-match",
			passed: true,
			message: `JSON structure in ${file} matches expected schema`,
		};
	}

	return {
		grader: "json-match",
		passed: false,
		message: `JSON structure in ${file} has ${errors.length} mismatch(es)`,
		detail: errors.join("; "),
	};
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
function validateStructure(
	actual: Record<string, unknown>,
	expected: Record<string, unknown>,
	prefix: string,
	errors: string[]
): void {
	for (const [key, expectedValue] of Object.entries(expected)) {
		const path = prefix ? `${prefix}.${key}` : key;
		const actualValue = actual[key];

		if (actualValue === undefined) {
			errors.push(`missing key "${path}"`);
			continue;
		}

		// If expected value is a string like "string", "number", "boolean", check type
		if (typeof expectedValue === "string") {
			const validTypes = ["string", "number", "boolean", "object", "array"];
			if (validTypes.includes(expectedValue)) {
				const actualType = Array.isArray(actualValue) ? "array" : typeof actualValue;
				if (actualType !== expectedValue) {
					errors.push(`"${path}" expected type ${expectedValue}, got ${actualType}`);
				}
				continue;
			}
		}

		// If expected is an object, recurse
		if (
			typeof expectedValue === "object" &&
			expectedValue !== null &&
			!Array.isArray(expectedValue)
		) {
			if (typeof actualValue !== "object" || actualValue === null || Array.isArray(actualValue)) {
				errors.push(
					`"${path}" expected object, got ${Array.isArray(actualValue) ? "array" : typeof actualValue}`
				);
			} else {
				validateStructure(
					actualValue as Record<string, unknown>,
					expectedValue as Record<string, unknown>,
					path,
					errors
				);
			}
		}
	}
}
