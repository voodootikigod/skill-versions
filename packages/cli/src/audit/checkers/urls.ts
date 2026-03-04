import type { AuditChecker, AuditFinding, CheckContext, ExtractedUrl } from "../types.js";

const CONCURRENCY_LIMIT = 5;
const TIMEOUT_MS = 10_000;

async function checkUrlLiveness(url: string): Promise<{ ok: boolean; status?: number }> {
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

		const response = await fetch(url, {
			method: "HEAD",
			signal: controller.signal,
			redirect: "follow",
			headers: {
				"User-Agent": "skillsafe-cli (https://skillsafe.sh)",
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

		// Only check http(s) URLs, skip localhost/127.0.0.1
		const checkable = context.urls.filter(
			(u) =>
				u.url.startsWith("http") && !u.url.includes("localhost") && !u.url.includes("127.0.0.1")
		);

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
