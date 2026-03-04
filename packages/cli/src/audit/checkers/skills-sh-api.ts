import { getJsonCached, setJsonCached } from "../cache.js";
import type {
	AuditFinding,
	AuditSeverity,
	CheckContext,
	RegistryAuditEntry,
	RegistryAuditResult,
} from "../types.js";

const SKILLS_SH_BASE = "https://skills.sh/api/audits";
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_ECOSYSTEM = "skills-sh";

interface SkillsShAuditResponse {
	audits?: Array<{
		auditor?: string;
		status?: string;
		riskLevel?: string;
		alertCount?: number;
		details?: string;
	}>;
}

function mapRiskToSeverity(riskLevel: string | undefined): AuditSeverity {
	switch (riskLevel?.toLowerCase()) {
		case "critical":
		case "high":
			return "critical";
		case "medium":
			return "high";
		case "low":
		case "safe":
		case "none":
			return "low";
		default:
			return "low";
	}
}

function isValidAuditor(auditor: string): auditor is "snyk" | "socket" | "gen" {
	return auditor === "snyk" || auditor === "socket" || auditor === "gen";
}

function parseResponse(
	data: SkillsShAuditResponse,
	skillName: string,
	file: string
): { findings: AuditFinding[]; registryAudit: RegistryAuditResult } {
	const entries: RegistryAuditEntry[] = [];
	const findings: AuditFinding[] = [];

	for (const audit of data.audits ?? []) {
		const auditor = audit.auditor?.toLowerCase() ?? "";
		if (!isValidAuditor(auditor)) {
			continue;
		}

		const entry: RegistryAuditEntry = {
			auditor,
			status: audit.status ?? "unknown",
			riskLevel: audit.riskLevel,
			alertCount: audit.alertCount,
			details: audit.details,
		};
		entries.push(entry);

		const status = (audit.status ?? "").toLowerCase();
		if (status !== "safe" && status !== "pass" && status !== "clean") {
			findings.push({
				file,
				line: 0,
				severity: mapRiskToSeverity(audit.riskLevel),
				category: "registry-audit",
				message: `${auditor}: ${audit.status ?? "unknown"}${audit.details ? ` — ${audit.details}` : ""}`,
				evidence: `risk=${audit.riskLevel ?? "unknown"}, alerts=${audit.alertCount ?? 0}`,
			});
		}
	}

	return {
		findings,
		registryAudit: { skillName, file, entries, raw: data },
	};
}

export async function fetchRegistryAudit(
	context: CheckContext
): Promise<{ findings: AuditFinding[]; registryAudit: RegistryAuditResult | null }> {
	const skillName =
		(context.file.frontmatter.name as string) ??
		(context.file.frontmatter.repository as string) ??
		null;

	if (!skillName) {
		return { findings: [], registryAudit: null };
	}

	const safeName = skillName.replace(/\//g, "__");

	// Check cache first
	const cached = await getJsonCached(CACHE_ECOSYSTEM, safeName);
	if (cached !== undefined) {
		const data = cached as SkillsShAuditResponse;
		const result = parseResponse(data, skillName, context.file.path);
		return result;
	}

	// Fetch from skills.sh
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		const response = await fetch(`${SKILLS_SH_BASE}/${encodeURIComponent(skillName)}`, {
			signal: controller.signal,
			headers: { Accept: "application/json" },
		});

		clearTimeout(timeout);

		if (!response.ok) {
			if (response.status === 404) {
				return { findings: [], registryAudit: null };
			}
			console.warn(`skills.sh audit API returned ${response.status} for ${skillName}`);
			return { findings: [], registryAudit: null };
		}

		const data: SkillsShAuditResponse = await response.json();

		// Cache the response
		await setJsonCached(CACHE_ECOSYSTEM, safeName, data);

		return parseResponse(data, skillName, context.file.path);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`Failed to fetch skills.sh audit for ${skillName}: ${message}`);
		return { findings: [], registryAudit: null };
	}
}
