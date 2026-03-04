import { coerce, eq, major, minor, valid } from "semver";
import type { CheckResult } from "./types.js";

/**
 * Determine severity of version difference.
 */
export function getSeverity(verified: string, latest: string): CheckResult["severity"] {
	if (eq(verified, latest)) {
		return "current";
	}
	if (major(latest) > major(verified)) {
		return "major";
	}
	if (minor(latest) > minor(verified)) {
		return "minor";
	}
	return "patch";
}

/**
 * Normalize a version string to valid semver.
 * Prefers strict parsing; falls back to coerce for non-standard formats.
 * Returns null if the version cannot be parsed at all.
 */
export function normalizeVersion(raw: string): { version: string; coerced: boolean } | null {
	const strict = valid(raw);
	if (strict) {
		return { version: strict, coerced: false };
	}

	const coerced = valid(coerce(raw));
	if (coerced) {
		return { version: coerced, coerced: true };
	}

	return null;
}
