import type { NpmDistTags } from "./types.js";

const NPM_REGISTRY = "https://registry.npmjs.org";

export interface NpmPackageMetadata {
	name: string;
	repository?: {
		type: string;
		url: string;
		directory?: string;
	};
}

/**
 * Fetch full package metadata from npm (includes repository URL).
 * Uses the full (non-abbreviated) metadata endpoint.
 */
export async function fetchPackageMetadata(packageName: string): Promise<NpmPackageMetadata> {
	const url = `${NPM_REGISTRY}/${encodeURIComponent(packageName)}`;
	const response = await fetch(url, {
		headers: {
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`npm registry returned ${response.status} for "${packageName}"`);
	}

	const data = (await response.json()) as NpmPackageMetadata;
	return { name: data.name, repository: data.repository };
}

/**
 * Fetch the latest version of a package from the npm registry.
 * Uses the abbreviated metadata endpoint for speed.
 */
export async function fetchLatestVersion(packageName: string): Promise<string> {
	const url = `${NPM_REGISTRY}/${encodeURIComponent(packageName)}`;
	const response = await fetch(url, {
		headers: {
			Accept: "application/vnd.npm.install-v1+json",
		},
	});

	if (!response.ok) {
		if (response.status === 404) {
			throw new Error(`Package "${packageName}" not found on npm`);
		}
		throw new Error(`npm registry returned ${response.status} for "${packageName}"`);
	}

	const data = (await response.json()) as { "dist-tags": NpmDistTags };
	const latest = data["dist-tags"]?.latest;

	if (!latest) {
		throw new Error(`No "latest" dist-tag found for "${packageName}"`);
	}

	return latest;
}

/**
 * Fetch latest versions for multiple packages in parallel.
 * Returns a map of packageName -> latestVersion.
 * Failed lookups are included with an error string.
 */
export async function fetchLatestVersions(
	packageNames: string[]
): Promise<Map<string, string | Error>> {
	const unique = [...new Set(packageNames)];
	const results = new Map<string, string | Error>();

	const settled = await Promise.allSettled(
		unique.map(async (name) => {
			try {
				const version = await fetchLatestVersion(name);
				return { name, version, error: undefined };
			} catch (error) {
				return {
					name,
					version: undefined,
					error: error instanceof Error ? error : new Error(String(error)),
				};
			}
		})
	);

	for (const result of settled) {
		if (result.status === "fulfilled") {
			const { name, version, error } = result.value;
			if (error) {
				results.set(name, error);
			} else if (version) {
				results.set(name, version);
			}
		}
	}

	return results;
}
