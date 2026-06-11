/**
 * Match a string against a simple glob pattern where `*` matches any run of
 * characters. All other regex metacharacters are escaped, so patterns are
 * literal aside from `*`.
 */
export function matchesGlob(value: string, pattern: string): boolean {
	const regexStr = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
	return new RegExp(`^${regexStr}$`).test(value);
}
