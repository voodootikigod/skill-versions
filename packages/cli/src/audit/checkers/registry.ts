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

async function checkNpmExists(name: string): Promise<boolean> {
	try {
		await fetchLatestVersion(name);
		return true;
	} catch {
		return false;
	}
}

async function checkPypiExists(name: string): Promise<boolean> {
	try {
		const response = await fetch(`${PYPI_API}/${encodeURIComponent(name)}/json`);
		return response.ok;
	} catch {
		return false;
	}
}

async function checkCratesExists(name: string): Promise<boolean> {
	try {
		const response = await fetch(`${CRATES_API}/${encodeURIComponent(name)}`, {
			headers: {
				"User-Agent": "skillsafe-cli (https://skillsafe.sh)",
			},
		});
		return response.ok;
	} catch {
		return false;
	}
}

async function checkExists(pkg: ExtractedPackage): Promise<boolean> {
	const key = cacheKey(pkg);

	// Check in-memory cache first
	const memoryCached = memoryCache.get(key);
	if (memoryCached !== undefined) {
		return memoryCached;
	}

	// Check persistent disk cache
	const diskCached = await getCached(pkg.ecosystem, pkg.name);
	if (diskCached !== undefined) {
		memoryCache.set(key, diskCached);
		return diskCached;
	}

	let exists: boolean;
	switch (pkg.ecosystem) {
		case "npm":
			exists = await checkNpmExists(pkg.name);
			break;
		case "pypi":
			exists = await checkPypiExists(pkg.name);
			break;
		case "crates":
			exists = await checkCratesExists(pkg.name);
			break;
		default:
			break;
	}

	memoryCache.set(key, exists);
	await setCached(pkg.ecosystem, pkg.name, exists);
	return exists;
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
			const exists = await checkExists(pkg);
			if (!exists) {
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
