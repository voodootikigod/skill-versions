import { fetchLatestVersion } from "../../npm.js";
import { getCached, setCached } from "../cache.js";
import type { AuditChecker, AuditFinding, CheckContext, ExtractedPackage } from "../types.js";

const PYPI_API = "https://pypi.org/pypi";
const CRATES_API = "https://crates.io/api/v1/crates";
const CONCURRENCY_LIMIT = 5;

// In-memory cache: package -> exists (true) or not found (false)
const memoryCache = new Map<string, boolean>();

function cacheKey(pkg: ExtractedPackage): string {
	return `${pkg.ecosystem}:${pkg.name}`;
}

export type RegistryCheckResult =
	| { status: "exists" }
	| { status: "missing" }
	| { status: "error"; error: Error };

async function checkNpmExists(name: string): Promise<RegistryCheckResult> {
	try {
		await fetchLatestVersion(name);
		return { status: "exists" };
	} catch (error) {
		if (error instanceof Error && error.name === "NotFoundError") {
			return { status: "missing" };
		}
		return { status: "error", error: error instanceof Error ? error : new Error(String(error)) };
	}
}

async function checkPypiExists(name: string): Promise<RegistryCheckResult> {
	try {
		const response = await fetch(`${PYPI_API}/${encodeURIComponent(name)}/json`);
		if (response.ok) {
			return { status: "exists" };
		}
		if (response.status === 404) {
			return { status: "missing" };
		}
		return { status: "error", error: new Error(`PyPI returned ${response.status}`) };
	} catch (error) {
		return { status: "error", error: error instanceof Error ? error : new Error(String(error)) };
	}
}

async function checkCratesExists(name: string): Promise<RegistryCheckResult> {
	try {
		const response = await fetch(`${CRATES_API}/${encodeURIComponent(name)}`, {
			headers: {
				"User-Agent": "skills-check-cli (https://skillscheck.ai)",
			},
		});
		if (response.ok) {
			return { status: "exists" };
		}
		if (response.status === 404) {
			return { status: "missing" };
		}
		return { status: "error", error: new Error(`Crates.io returned ${response.status}`) };
	} catch (error) {
		return { status: "error", error: error instanceof Error ? error : new Error(String(error)) };
	}
}

const activeRegistryChecks = new Map<string, Promise<RegistryCheckResult>>();

async function checkExists(pkg: ExtractedPackage): Promise<RegistryCheckResult> {
	const key = cacheKey(pkg);

	// Check in-memory cache first
	const memoryCached = memoryCache.get(key);
	if (memoryCached !== undefined) {
		return { status: memoryCached ? "exists" : "missing" };
	}

	const active = activeRegistryChecks.get(key);
	if (active) {
		return active;
	}

	const promise = (async (): Promise<RegistryCheckResult> => {
		// Check persistent disk cache
		const diskCached = await getCached(pkg.ecosystem, pkg.name);
		if (diskCached !== undefined) {
			memoryCache.set(key, diskCached);
			return { status: diskCached ? "exists" : "missing" };
		}

		let result: RegistryCheckResult = { status: "exists" };
		switch (pkg.ecosystem) {
			case "npm":
				result = await checkNpmExists(pkg.name);
				break;
			case "pypi":
				result = await checkPypiExists(pkg.name);
				break;
			case "crates":
				result = await checkCratesExists(pkg.name);
				break;
			default:
				break;
		}

		if (result.status !== "error") {
			const exists = result.status === "exists";
			memoryCache.set(key, exists);
			await setCached(pkg.ecosystem, pkg.name, exists);
		}
		return result;
	})();

	activeRegistryChecks.set(key, promise);

	try {
		return await promise;
	} finally {
		activeRegistryChecks.delete(key);
	}
}

function withConcurrencyLimit<T>(
	items: T[],
	limit: number,
	fn: (item: T) => Promise<void>
): Promise<void> {
	let running = 0;
	let index = 0;

	return new Promise((resolve, reject) => {
		function next() {
			while (running < limit && index < items.length) {
				const currentIndex = index++;
				running++;
				fn(items[currentIndex])
					.then(() => {
						running--;
						if (index >= items.length && running === 0) {
							resolve();
						} else {
							next();
						}
					})
					.catch(reject);
			}
			if (items.length === 0) {
				resolve();
			}
		}
		next();
	});
}

export const registryChecker: AuditChecker = {
	name: "hallucinated-package",
	async check(context: CheckContext): Promise<AuditFinding[]> {
		const findings: AuditFinding[] = [];

		// Deduplicate packages by ecosystem:name
		const seen = new Set<string>();
		const unique: ExtractedPackage[] = [];
		for (const pkg of context.packages) {
			const key = cacheKey(pkg);
			if (!seen.has(key)) {
				seen.add(key);
				unique.push(pkg);
			}
		}

		await withConcurrencyLimit(unique, CONCURRENCY_LIMIT, async (pkg) => {
			const result = await checkExists(pkg);
			if (result.status === "missing") {
				// Find all lines where this package appears
				const allOccurrences = context.packages.filter(
					(p) => p.ecosystem === pkg.ecosystem && p.name === pkg.name
				);
				for (const occurrence of allOccurrences) {
					findings.push({
						file: context.file.path,
						line: occurrence.line,
						severity: "critical",
						category: "hallucinated-package",
						message: `Package "${pkg.name}" not found on ${pkg.ecosystem}`,
						evidence: occurrence.source,
					});
				}
			} else if (result.status === "error") {
				console.warn(
					`Warning: Failed to connect to ${pkg.ecosystem} registry to verify package "${pkg.name}". Skipping verification. Error: &quot;${result.error.message}&quot;`.replace(
						/&quot;/g,
						'"'
					)
				);
			}
		});

		return findings;
	},
};

/**
 * Clear the in-memory registry cache (useful for testing).
 */
export function clearRegistryCache(): void {
	memoryCache.clear();
}
