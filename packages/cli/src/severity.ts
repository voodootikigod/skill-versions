import * as semver from "semver";
import type { CheckResult } from "./types.js";

/**
 * Determine severity of version difference.
 */
export function getSeverity(verified: string, latest: string): CheckResult["severity"] {
	if (semver.eq(verified, latest)) return "current";
	if (semver.major(latest) > semver.major(verified)) return "major";
	if (semver.minor(latest) > semver.minor(verified)) return "minor";
	return "patch";
}

/**
 * Normalize a version string to valid semver.
 * Prefers strict parsing; falls back to coerce for non-standard formats.
 * Returns null if the version cannot be parsed at all.
 */
export function normalizeVersion(raw: string): { version: string; coerced: boolean } | null {
	const strict = semver.valid(raw);
	if (strict) return { version: strict, coerced: false };

	const coerced = semver.valid(semver.coerce(raw));
	if (coerced) return { version: coerced, coerced: true };

	return null;
}
