export type { Registry, RegistryProduct } from "@skill-versions/schema";

/**
 * Result of checking a single product against npm
 */
export interface CheckResult {
	product: string;
	displayName: string;
	package: string;
	verifiedVersion: string;
	latestVersion: string;
	skills: string[];
	changelog?: string;
	stale: boolean;
	severity: "major" | "minor" | "patch" | "current";
}

/**
 * Scanned skill from SKILL.md frontmatter
 */
export interface ScannedSkill {
	name: string;
	path: string;
	productVersion?: string;
	product?: string;
}

/**
 * npm registry response (partial)
 */
export interface NpmDistTags {
	latest: string;
	[tag: string]: string;
}

/**
 * Exit codes for CLI
 */
export const ExitCode = {
	OK: 0,
	STALE: 1,
	ERROR: 2,
} as const;
