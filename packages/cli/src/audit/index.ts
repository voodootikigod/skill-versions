import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { readSkillFile } from "../skill-io.js";
import { advisoryChecker } from "./checkers/advisory.js";
import { commandsChecker } from "./checkers/commands.js";
import { injectionChecker } from "./checkers/injection.js";
import { metadataChecker } from "./checkers/metadata.js";
import { registryChecker } from "./checkers/registry.js";
import { fetchRegistryAudit } from "./checkers/skills-sh-api.js";
import { urlChecker } from "./checkers/urls.js";
import { extractCommands } from "./extractors/commands.js";
import { extractPackages } from "./extractors/packages.js";
import { extractUrls } from "./extractors/urls.js";
import { loadIgnoreRules, shouldIgnore } from "./ignore.js";
import type {
	AuditChecker,
	AuditFinding,
	AuditOptions,
	AuditReport,
	CheckContext,
	RegistryAuditResult,
} from "./types.js";

async function discoverSkillFiles(dir: string): Promise<string[]> {
	const files: string[] = [];

	let entries: string[];
	try {
		entries = await readdir(dir);
	} catch {
		throw new Error(`Cannot read directory: ${dir}`);
	}

	for (const entry of entries) {
		const fullPath = join(dir, entry);
		try {
			const info = await stat(fullPath);
			if (info.isDirectory()) {
				const skillPath = join(fullPath, "SKILL.md");
				try {
					await stat(skillPath);
					files.push(skillPath);
				} catch {
					// No SKILL.md here — recurse deeper
					const nested = await discoverSkillFiles(fullPath);
					files.push(...nested);
				}
			} else if (entry === "SKILL.md") {
				files.push(fullPath);
			}
		} catch {
			// skip inaccessible entries
		}
	}

	return files.sort();
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
export async function runAudit(paths: string[], options: AuditOptions = {}): Promise<AuditReport> {
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

	const emptyReport: AuditReport = {
		files: 0,
		findings: [],
		summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
		generatedAt: new Date().toISOString(),
	};

	if (allFiles.length === 0) {
		return emptyReport;
	}

	// Load ignore rules
	const ignoreRules = await loadIgnoreRules(options.ignorePath);

	// Select checkers based on options
	let checkers: AuditChecker[];
	if (options.packagesOnly) {
		checkers = [registryChecker, advisoryChecker];
	} else if (options.uniqueOnly) {
		checkers = [registryChecker, advisoryChecker, metadataChecker];
		if (!options.skipUrls) {
			checkers.push(urlChecker);
		}
	} else {
		checkers = [
			registryChecker,
			advisoryChecker,
			injectionChecker,
			commandsChecker,
			metadataChecker,
		];
		if (!options.skipUrls) {
			checkers.push(urlChecker);
		}
	}

	const allFindings: AuditFinding[] = [];
	const registryAudits: RegistryAuditResult[] = [];

	for (const filePath of allFiles) {
		// Read and parse
		const skillFile = await readSkillFile(filePath);

		// Extract once
		const packages = extractPackages(skillFile.raw);
		const commands = extractCommands(skillFile.raw);
		const urls = extractUrls(skillFile.raw);

		const context: CheckContext = {
			file: skillFile,
			packages,
			commands,
			urls,
		};

		// Run all checkers
		for (const checker of checkers) {
			const findings = await checker.check(context);
			// Filter out ignored findings
			for (const finding of findings) {
				if (!shouldIgnore(finding, ignoreRules, skillFile.raw)) {
					allFindings.push(finding);
				}
			}
		}

		// Fetch registry audits if requested
		if (options.includeRegistryAudits) {
			const result = await fetchRegistryAudit(context);
			if (result.registryAudit) {
				registryAudits.push(result.registryAudit);
			}
			for (const finding of result.findings) {
				if (!shouldIgnore(finding, ignoreRules, skillFile.raw)) {
					allFindings.push(finding);
				}
			}
		}
	}

	// Compute summary
	const summary = {
		critical: allFindings.filter((f) => f.severity === "critical").length,
		high: allFindings.filter((f) => f.severity === "high").length,
		medium: allFindings.filter((f) => f.severity === "medium").length,
		low: allFindings.filter((f) => f.severity === "low").length,
		total: allFindings.length,
	};

	return {
		files: allFiles.length,
		findings: allFindings,
		summary,
		generatedAt: new Date().toISOString(),
		...(registryAudits.length > 0 ? { registryAudits } : {}),
	};
}
