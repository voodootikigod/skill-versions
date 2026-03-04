import type { SkillFile } from "../skill-io.js";

export type AuditSeverity = "critical" | "high" | "medium" | "low";

export type AuditCategory =
	| "hallucinated-package"
	| "prompt-injection"
	| "dangerous-command"
	| "metadata-incomplete"
	| "url-liveness"
	| "advisory-match"
	| "registry-audit";

export interface AuditFinding {
	category: AuditCategory;
	evidence: string;
	file: string;
	line: number;
	message: string;
	note?: string;
	severity: AuditSeverity;
}

export interface AuditSummary {
	critical: number;
	high: number;
	low: number;
	medium: number;
	total: number;
}

export interface RegistryAuditEntry {
	alertCount?: number;
	auditor: "snyk" | "socket" | "gen";
	details?: string;
	riskLevel?: string;
	status: string;
}

export interface RegistryAuditResult {
	entries: RegistryAuditEntry[];
	file: string;
	raw?: unknown;
	skillName: string;
}

export interface AuditReport {
	files: number;
	findings: AuditFinding[];
	generatedAt: string;
	registryAudits?: RegistryAuditResult[];
	summary: AuditSummary;
}

export interface ExtractedPackage {
	ecosystem: "npm" | "pypi" | "crates";
	line: number;
	name: string;
	source: string;
}

export interface ExtractedCommand {
	command: string;
	line: number;
}

export interface ExtractedUrl {
	line: number;
	text?: string;
	url: string;
}

export interface CheckContext {
	commands: ExtractedCommand[];
	file: SkillFile;
	packages: ExtractedPackage[];
	urls: ExtractedUrl[];
}

export interface AuditChecker {
	check(context: CheckContext): Promise<AuditFinding[]>;
	name: string;
}

export interface AuditOptions {
	failOn?: AuditSeverity;
	format?: "terminal" | "json" | "markdown" | "sarif";
	ignorePath?: string;
	includeRegistryAudits?: boolean;
	output?: string;
	packagesOnly?: boolean;
	skipUrls?: boolean;
	uniqueOnly?: boolean;
}
