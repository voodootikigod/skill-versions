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
	freshness?: {
		max_age_days?: number;
		max_version_drift?: "major" | "minor" | "patch";
		require_product_version?: boolean;
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
	format?: "terminal" | "json";
	output?: string;
	policy?: string;
	skill?: string;
}
