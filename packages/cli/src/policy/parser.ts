import { readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { SkillPolicy } from "./types.js";

/**
 * Dynamically import js-yaml (transitive dep via gray-matter).
 * Uses dynamic import to avoid adding a direct dependency.
 */
async function loadYaml(): Promise<{ load: (str: string) => unknown }> {
	const mod = await import("js-yaml");
	return (mod.default ?? mod) as { load: (str: string) => unknown };
}

/**
 * Parse a .skill-policy.yml string into a SkillPolicy object.
 * Throws on invalid YAML or missing version field.
 */
export async function parsePolicy(content: string): Promise<SkillPolicy> {
	const yaml = await loadYaml();
	const raw = yaml.load(content);

	if (raw === null || raw === undefined || typeof raw !== "object") {
		throw new Error("Policy file is empty or not a valid YAML object");
	}

	const policy = raw as Record<string, unknown>;

	if (!("version" in policy) || typeof policy.version !== "number") {
		throw new Error('Policy file must have a numeric "version" field');
	}

	if (policy.version !== 1) {
		throw new Error(`Unsupported policy version: ${policy.version}. Only version 1 is supported`);
	}

	return raw as SkillPolicy;
}

/**
 * Validate a parsed SkillPolicy for structural issues.
 * Returns an array of validation error strings (empty = valid).
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
export function validatePolicy(policy: SkillPolicy): string[] {
	const errors: string[] = [];

	if (policy.version !== 1) {
		errors.push(`Unsupported policy version: ${policy.version}. Only version 1 is supported`);
	}

	// Validate sources
	if (policy.sources) {
		if (policy.sources.allow && !Array.isArray(policy.sources.allow)) {
			errors.push("sources.allow must be an array of strings");
		}
		if (policy.sources.deny && !Array.isArray(policy.sources.deny)) {
			errors.push("sources.deny must be an array of strings");
		}
	}

	// Validate required
	if (policy.required) {
		if (Array.isArray(policy.required)) {
			for (let i = 0; i < policy.required.length; i++) {
				const req = policy.required[i];
				if (!req.skill || typeof req.skill !== "string") {
					errors.push(`required[${i}] must have a "skill" string field`);
				}
			}
		} else {
			errors.push("required must be an array");
		}
	}

	// Validate banned
	if (policy.banned) {
		if (Array.isArray(policy.banned)) {
			for (let i = 0; i < policy.banned.length; i++) {
				const ban = policy.banned[i];
				if (!ban.skill || typeof ban.skill !== "string") {
					errors.push(`banned[${i}] must have a "skill" string field`);
				}
			}
		} else {
			errors.push("banned must be an array");
		}
	}

	// Validate metadata
	if (policy.metadata) {
		if (policy.metadata.required_fields && !Array.isArray(policy.metadata.required_fields)) {
			errors.push("metadata.required_fields must be an array of strings");
		}
		if (policy.metadata.allowed_licenses && !Array.isArray(policy.metadata.allowed_licenses)) {
			errors.push("metadata.allowed_licenses must be an array of strings");
		}
	}

	// Validate content patterns compile as regex
	if (policy.content) {
		if (policy.content.deny_patterns) {
			if (Array.isArray(policy.content.deny_patterns)) {
				for (const dp of policy.content.deny_patterns) {
					try {
						new RegExp(dp.pattern);
					} catch {
						errors.push(`content.deny_patterns: invalid regex "${dp.pattern}"`);
					}
					if (!dp.reason || typeof dp.reason !== "string") {
						errors.push(
							`content.deny_patterns: pattern "${dp.pattern}" must have a "reason" string`
						);
					}
				}
			} else {
				errors.push("content.deny_patterns must be an array");
			}
		}
		if (policy.content.require_patterns) {
			if (Array.isArray(policy.content.require_patterns)) {
				for (const rp of policy.content.require_patterns) {
					try {
						new RegExp(rp.pattern);
					} catch {
						errors.push(`content.require_patterns: invalid regex "${rp.pattern}"`);
					}
					if (!rp.reason || typeof rp.reason !== "string") {
						errors.push(
							`content.require_patterns: pattern "${rp.pattern}" must have a "reason" string`
						);
					}
				}
			} else {
				errors.push("content.require_patterns must be an array");
			}
		}
	}

	// Validate freshness
	if (policy.freshness) {
		if (
			policy.freshness.max_version_drift &&
			!["major", "minor", "patch"].includes(policy.freshness.max_version_drift)
		) {
			errors.push(
				`freshness.max_version_drift must be "major", "minor", or "patch" (got "${policy.freshness.max_version_drift}")`
			);
		}
		if (
			policy.freshness.max_age_days !== undefined &&
			typeof policy.freshness.max_age_days !== "number"
		) {
			errors.push("freshness.max_age_days must be a number");
		}
	}

	// Validate audit
	if (
		policy.audit?.min_severity_to_block &&
		!["critical", "high", "medium", "low"].includes(policy.audit.min_severity_to_block)
	) {
		errors.push(
			`audit.min_severity_to_block must be "critical", "high", "medium", or "low" (got "${policy.audit.min_severity_to_block}")`
		);
	}

	return errors;
}

/**
 * Walk up the directory tree from startDir to find a .skill-policy.yml file.
 * Returns the absolute path to the policy file, or null if not found.
 */
export async function discoverPolicyFile(startDir: string): Promise<string | null> {
	let current = resolve(startDir);
	const root = resolve("/");

	while (current !== root) {
		const candidate = join(current, ".skill-policy.yml");
		try {
			await stat(candidate);
			return candidate;
		} catch {
			// Not found, continue walking up
		}
		const parent = dirname(current);
		if (parent === current) {
			break;
		}
		current = parent;
	}

	return null;
}

/**
 * Load and parse a policy file from disk.
 */
export async function loadPolicyFile(filePath: string): Promise<SkillPolicy> {
	const content = await readFile(filePath, "utf-8");
	return parsePolicy(content);
}
