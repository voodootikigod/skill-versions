import { lookup } from "node:dns/promises";
import { getCached, setCached } from "../cache.js";
import type { AuditChecker, AuditFinding, CheckContext, ExtractedUrl } from "../types.js";

const URL_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const CONCURRENCY_LIMIT = 5;
const TIMEOUT_MS = 10_000;
const DNS_TIMEOUT_MS = 5000;
const PRIVATE_172_RE = /^172\.(1[6-9]|2\d|3[01])\./;

function lookupWithTimeout(hostname: string, timeoutMs: number) {
	return new Promise<Awaited<ReturnType<typeof lookup>>>((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error("DNS lookup timed out"));
		}, timeoutMs);

		lookup(hostname)
			.then((result) => {
				clearTimeout(timer);
				resolve(result);
			})
			.catch((error) => {
				clearTimeout(timer);
				reject(error);
			});
	});
}

/**
 * Check if an IP address is private, loopback, link-local, or a cloud metadata endpoint.
 */
function isPrivateIp(ip: string): boolean {
	// IPv4 loopback
	if (ip.startsWith("127.") || ip === "0.0.0.0") {
		return true;
	}
	// IPv4 private ranges
	if (ip.startsWith("10.")) {
		return true;
	}
	if (ip.startsWith("192.168.")) {
		return true;
	}
	if (PRIVATE_172_RE.test(ip)) {
		return true;
	}
	// IPv4 link-local
	if (ip.startsWith("169.254.")) {
		return true;
	}
	// IPv6 loopback, link-local, and unique local (ULA)
	if (ip === "::1" || ip.startsWith("fe80:") || ip === "::") {
		return true;
	}
	// IPv6 ULA (fc00::/7 = fc00:: through fdff::)
	const lowerIp = ip.toLowerCase();
	if (lowerIp.startsWith("fc") || lowerIp.startsWith("fd")) {
		return true;
	}
	return false;
}

/**
 * Check if a URL hostname points to a known cloud metadata endpoint.
 */
function isCloudMetadataHost(hostname: string): boolean {
	const blocked = ["169.254.169.254", "metadata.google.internal", "metadata.goog"];
	return blocked.includes(hostname.toLowerCase());
}

/**
 * Validate that a URL does not target private/internal network addresses.
 * Returns true if the URL is safe to fetch.
 */
async function isSafeUrl(url: string): Promise<boolean> {
	try {
		const parsed = new URL(url);
		const hostname = parsed.hostname;

		// Block known cloud metadata endpoints
		if (isCloudMetadataHost(hostname)) {
			return false;
		}

		// Block common private-network hostnames
		if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
			return false;
		}

		// Resolve DNS with timeout and check the IP
		try {
			const result = await lookupWithTimeout(hostname, DNS_TIMEOUT_MS);
			if (isPrivateIp(result.address)) {
				return false;
			}
		} catch {
			// DNS resolution failed or timed out — allow fetch to fail naturally
		}

		return true;
	} catch {
		return false;
	}
}

const activeChecks = new Map<string, Promise<{ ok: boolean; status?: number }>>();

async function checkUrlLivenessCached(url: string): Promise<{ ok: boolean; status?: number }> {
	const active = activeChecks.get(url);
	if (active) {
		return active;
	}

	const promise = (async () => {
		const cached = await getCached("url-liveness", url, URL_TTL_MS);
		if (cached !== undefined) {
			return { ok: cached };
		}
		const result = await checkUrlLiveness(url);
		await setCached("url-liveness", url, result.ok);
		return result;
	})();

	activeChecks.set(url, promise);

	try {
		return await promise;
	} finally {
		activeChecks.delete(url);
	}
}

async function checkUrlLiveness(url: string): Promise<{ ok: boolean; status?: number }> {
	try {
		if (!(await isSafeUrl(url))) {
			return { ok: false };
		}

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

		try {
			const response = await fetch(url, {
				method: "HEAD",
				signal: controller.signal,
				redirect: "follow",
				headers: {
					"User-Agent": "skills-check-cli (https://skillscheck.ai)",
				},
			});

			return { ok: response.ok, status: response.status };
		} finally {
			clearTimeout(timer);
		}
	} catch {
		// Network error, timeout, or DNS failure
		return { ok: false };
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

export const urlChecker: AuditChecker = {
	name: "url-liveness",
	async check(context: CheckContext): Promise<AuditFinding[]> {
		const findings: AuditFinding[] = [];

		// Only check http(s) URLs — private/internal filtering happens in checkUrlLiveness
		const checkable = context.urls.filter((u) => u.url.startsWith("http"));

		// Deduplicate by URL
		const seen = new Set<string>();
		const unique: ExtractedUrl[] = [];
		for (const u of checkable) {
			if (!seen.has(u.url)) {
				seen.add(u.url);
				unique.push(u);
			}
		}

		await withConcurrencyLimit(unique, CONCURRENCY_LIMIT, async (extracted) => {
			const result = await checkUrlLivenessCached(extracted.url);
			if (!result.ok) {
				const statusInfo = result.status ? ` (HTTP ${result.status})` : " (connection failed)";
				// Find all lines where this URL appears
				const allOccurrences = context.urls.filter((u) => u.url === extracted.url);
				for (const occurrence of allOccurrences) {
					findings.push({
						file: context.file.path,
						line: occurrence.line,
						severity: "medium",
						category: "url-liveness",
						message: `URL unreachable${statusInfo}: ${extracted.url}`,
						evidence: extracted.text ? `[${extracted.text}](${extracted.url})` : extracted.url,
					});
				}
			}
		});

		return findings;
	},
};
