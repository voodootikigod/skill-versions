import { stat } from "node:fs/promises";
import { discoverSkillFiles } from "../shared/discovery.js";
import { readSkillFile } from "../skill-io.js";
import { advisoryChecker } from "./checkers/advisory.js";
import { commandsChecker } from "./checkers/commands.js";
import { injectionChecker } from "./checkers/injection.js";
import { metadataChecker } from "./checkers/metadata.js";
import { registryChecker } from "./checkers/registry.js";
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
} from "./types.js";

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
	};
}
