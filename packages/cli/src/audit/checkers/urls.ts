import { lookup } from "node:dns/promises";
import type { AuditChecker, AuditFinding, CheckContext, ExtractedUrl } from "../types.js";

const CONCURRENCY_LIMIT = 5;
const TIMEOUT_MS = 10_000;

/**
 * Check if an IP address is private, loopback, link-local, or a cloud metadata endpoint.
 */
function isPrivateIp(ip: string): boolean {
	// IPv4 loopback
	if (ip.startsWith("127.") || ip === "0.0.0.0") return true;
	// IPv4 private ranges
	if (ip.startsWith("10.")) return true;
	if (ip.startsWith("192.168.")) return true;
	if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
	// IPv4 link-local
	if (ip.startsWith("169.254.")) return true;
	// IPv6 loopback and link-local
	if (ip === "::1" || ip.startsWith("fe80:") || ip === "::") return true;
	return false;
}

/**
 * Check if a URL hostname points to a known cloud metadata endpoint.
 */
function isCloudMetadataHost(hostname: string): boolean {
	const blocked = [
		"169.254.169.254",
		"metadata.google.internal",
		"metadata.goog",
	];
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
		if (isCloudMetadataHost(hostname)) return false;

		// Block common private-network hostnames
		if (
			hostname === "localhost" ||
			hostname.endsWith(".local") ||
			hostname.endsWith(".internal")
		) {
			return false;
		}

		// Resolve DNS and check the IP
		try {
			const result = await lookup(hostname);
			if (isPrivateIp(result.address)) return false;
		} catch {
			// DNS resolution failed — allow fetch to fail naturally
		}

		return true;
	} catch {
		return false;
	}
}

async function checkUrlLiveness(url: string): Promise<{ ok: boolean; status?: number }> {
	try {
		if (!(await isSafeUrl(url))) {
			return { ok: false };
		}

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

		const response = await fetch(url, {
			method: "HEAD",
			signal: controller.signal,
			redirect: "follow",
			headers: {
				"User-Agent": "skills-check-cli (https://skillscheck.ai)",
			},
		});

		clearTimeout(timer);
		return { ok: response.ok, status: response.status };
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
			const result = await checkUrlLiveness(extracted.url);
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
