import type { NpmDistTags } from "./types.js";

const NPM_REGISTRY = "https://registry.npmjs.org";

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
	packageNames: string[],
): Promise<Map<string, string | Error>> {
	const unique = [...new Set(packageNames)];
	const results = new Map<string, string | Error>();

	const settled = await Promise.allSettled(
		unique.map(async (name) => {
			const version = await fetchLatestVersion(name);
			return { name, version };
		}),
	);

	for (const result of settled) {
		if (result.status === "fulfilled") {
			results.set(result.value.name, result.value.version);
		} else {
			const match = result.reason?.message?.match(/"([^"]+)"/);
			const name = match?.[1] ?? "unknown";
			results.set(name, new Error(result.reason?.message ?? "Unknown error"));
		}
	}

	return results;
}
