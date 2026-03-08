/**
 * Registry format: skills-check.json
 */
export interface Registry {
	$schema?: string;
	lastCheck?: string;
	products: Record<string, RegistryProduct>;
	skillsDir?: string;
	version: number;
}

export interface RegistryProduct {
	agents?: string[];
	changelog?: string;
	displayName: string;
	package: string;
	skills: string[];
	verifiedAt: string;
	verifiedVersion: string;
}

/**
 * Telemetry event emitted when a skill is detected in an LLM request.
 */
export interface SkillTelemetryEvent {
	schema_version: 1;
	timestamp: string;
	detection: "watermark" | "frontmatter_hash" | "content_hash" | "prefix_hash";
	confidence: number;
	skill: {
		name: string;
		version: string;
		source?: string;
	};
	request: {
		id: string;
		model: string;
		skill_tokens: number;
		total_prompt_tokens?: number;
	};
	org?: {
		user?: string;
		team?: string;
		project?: string;
	};
}

/**
 * A registry of fingerprints for installed skills.
 */
export interface FingerprintRegistry {
	version: 1;
	generated: string;
	skills: FingerprintEntry[];
}

export interface FingerprintEntry {
	name: string;
	version: string;
	source?: string;
	fingerprints: {
		watermark?: string;
		frontmatter_sha256: string;
		content_sha256: string;
		content_prefix_sha256: string;
	};
	token_count: number;
	path: string;
}
