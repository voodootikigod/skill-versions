/**
 * A time-boxed waiver that suppresses findings for a specific rule (and
 * optionally a specific skill). Exemptions are never silent — suppressed
 * findings are counted and reported, and expired exemptions stop suppressing.
 */
export interface PolicyExemption {
	/** Person or team accountable for the waiver. */
	approved_by?: string;
	/** ISO 8601 date (YYYY-MM-DD or full timestamp). After this, the waiver is inert. */
	expires?: string;
	/** Why the waiver exists (required — no silent blanket waivers). */
	reason: string;
	/** Rule name to waive (e.g. "sources.allow", "banned") or "*" for any rule. */
	rule: string;
	/** Optional skill-name glob to scope the waiver; omitted = applies to any skill. */
	skill?: string;
}

export interface SkillPolicy {
	audit?: {
		require_clean?: boolean;
		min_severity_to_block?: "critical" | "high" | "medium" | "low";
	};
	banned?: Array<{ skill: string; reason?: string }>;
	content?: {
		deny_patterns?: Array<{ pattern: string; reason: string }>;
		require_patterns?: Array<{ pattern: string; reason: string }>;
	};
	/** Time-boxed waivers that suppress matching findings. */
	exemptions?: PolicyExemption[];
	/** Paths to base policy files to inherit from (relative to this file). Child overrides. */
	extends?: string | string[];
	freshness?: {
		max_age_days?: number;
		max_version_drift?: "major" | "minor" | "patch";
		/** @deprecated Use require_version_tracking instead */
		require_product_version?: boolean;
		require_version_tracking?: boolean;
	};
	metadata?: {
		required_fields?: string[];
		require_license?: boolean;
		allowed_licenses?: string[];
	};
	required?: Array<{ source?: string; skill: string }>;
	sources?: { allow?: string[]; deny?: string[] };
	version: number;
}

export type PolicySeverity = "blocked" | "violation" | "warning";

export interface PolicyFinding {
	detail?: string;
	file: string;
	line?: number;
	message: string;
	rule: string;
	severity: PolicySeverity;
}

export interface PolicyReport {
	/** Findings suppressed by an active exemption (recorded, never silently dropped). */
	exempted: PolicyFinding[];
	files: number;
	findings: PolicyFinding[];
	generatedAt: string;
	policyFile: string;
	required: Array<{ skill: string; satisfied: boolean }>;
	summary: { blocked: number; violations: number; warnings: number };
}

export interface PolicyOptions {
	ci?: boolean;
	failOn?: PolicySeverity;
	format?: "terminal" | "json" | "markdown" | "sarif";
	output?: string;
	policy?: string;
	skill?: string;
}
