import { stat } from "node:fs/promises";
import { discoverSkillFiles } from "../shared/discovery.js";
import type { SkillFile } from "../skill-io.js";
import { readSkillFile } from "../skill-io.js";
import type { PolicyFinding, PolicyOptions, PolicyReport, SkillPolicy } from "./types.js";
import { checkAuditClean } from "./validators/audit-integration.js";
import { checkBanned } from "./validators/banned.js";
import { checkContent } from "./validators/content.js";
import { checkFreshness } from "./validators/freshness.js";
import { checkMetadata } from "./validators/metadata.js";
import { checkRequired } from "./validators/required.js";
import { checkSources } from "./validators/sources.js";

/**
 * Run a policy check against discovered skill files.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
export async function runPolicyCheck(
	paths: string[],
	policy: SkillPolicy,
	policyFile: string,
	options: PolicyOptions = {}
): Promise<PolicyReport> {
	// Discover all skill files
	const allFiles: string[] = [];
	for (const p of paths) {
		try {
			const info = await stat(p);
			if (info.isDirectory()) {
				const discovered = await discoverSkillFiles(p);
				allFiles.push(...discovered);
			} else if (p.endsWith(".md")) {
				allFiles.push(p);
			}
		} catch {
			throw new Error(`Cannot access path: ${p}`);
		}
	}

	// Filter by skill name if specified
	let filesToCheck = allFiles;
	if (options.skill) {
		const skillFilter = options.skill;
		// We need to read files to check the name, so read all first
		const readFiles: SkillFile[] = [];
		for (const filePath of allFiles) {
			const sf = await readSkillFile(filePath);
			readFiles.push(sf);
		}
		const matchingFiles = readFiles.filter((sf) => sf.frontmatter.name === skillFilter);
		if (matchingFiles.length === 0) {
			// Fall back to path matching
			filesToCheck = allFiles.filter((f) => f.toLowerCase().includes(skillFilter.toLowerCase()));
		} else {
			filesToCheck = matchingFiles.map((sf) => sf.path);
		}
	}

	const allFindings: PolicyFinding[] = [];
	const skillFiles: SkillFile[] = [];

	// Read and validate each skill file
	for (const filePath of filesToCheck) {
		const sf = await readSkillFile(filePath);
		skillFiles.push(sf);

		// Run per-file validators
		allFindings.push(...checkSources(sf, policy));
		allFindings.push(...checkBanned(sf, policy));
		allFindings.push(...checkMetadata(sf, policy));
		allFindings.push(...checkContent(sf, policy));
		allFindings.push(...checkFreshness(sf, policy));
	}

	// Check required skills (across all discovered files, not just filtered)
	let allSkillFiles = skillFiles;
	if (options.skill) {
		// For required check, always use all discovered files
		allSkillFiles = [];
		for (const filePath of allFiles) {
			allSkillFiles.push(await readSkillFile(filePath));
		}
	}
	const required = checkRequired(allSkillFiles, policy);

	// Add findings for unsatisfied required skills
	for (const req of required) {
		if (!req.satisfied) {
			allFindings.push({
				file: "<project>",
				severity: "violation",
				rule: "required",
				message: `Required skill "${req.skill}" is not installed`,
			});
		}
	}

	// Audit integration (only if paths are provided and audit required)
	if (policy.audit?.require_clean) {
		const auditFindings = await checkAuditClean(paths, policy);
		allFindings.push(...auditFindings);
	}

	// Compute summary
	const summary = {
		blocked: allFindings.filter((f) => f.severity === "blocked").length,
		violations: allFindings.filter((f) => f.severity === "violation").length,
		warnings: allFindings.filter((f) => f.severity === "warning").length,
	};

	return {
		policyFile,
		files: filesToCheck.length,
		findings: allFindings,
		required,
		summary,
		generatedAt: new Date().toISOString(),
	};
}
