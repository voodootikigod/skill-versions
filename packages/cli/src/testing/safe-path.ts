import { resolve } from "node:path";

/**
 * Resolve a potentially untrusted relative path and verify it stays within the
 * allowed base directory. Returns the resolved absolute path, or throws if the
 * path would escape the base directory (e.g. via `../` traversal).
 */
export function safePath(baseDir: string, untrustedPath: string): string {
	const resolved = resolve(baseDir, untrustedPath);
	const normalizedBase = resolve(baseDir);

	if (!resolved.startsWith(normalizedBase + "/") && resolved !== normalizedBase) {
		throw new Error(
			`Path traversal detected: "${untrustedPath}" resolves outside "${normalizedBase}"`,
		);
	}

	return resolved;
}
