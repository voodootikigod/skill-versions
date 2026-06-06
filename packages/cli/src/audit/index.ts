import { stat } from "node:fs/promises";
import { discoverSkillFiles } from "../shared/discovery.js";
import { readSkillFile } from "../skill-io.js";
import type { AllowedTool } from "../types.js";
import { configureCache } from "./cache.js";
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

const ALLOWED_TOOLS_SPLIT_RE = /\s+/;
const ALLOWED_TOOL_DECLARATION_RE = /^([A-Z][a-zA-Z0-9]*)(?:\(([^)]*)\))?$/;

async function mapConcurrent<T, R>(
	items: T[],
	limit: number,
	fn: (item: T) => Promise<R>
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let index = 0;

	async function worker(): Promise<void> {
		while (index < items.length) {
			const currentIndex = index++;
			results[currentIndex] = await fn(items[currentIndex]);
		}
	}

	const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
	await Promise.all(workers);
	return results;
}

export async function runAudit(paths: string[], options: AuditOptions = {}): Promise<AuditReport> {
	configureCache({ force: options.force, noCache: options.noCache });
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
	const fileResults = await mapConcurrent(allFiles, 10, async (filePath) => {
		// Read and parse
		const skillFile = await readSkillFile(filePath);

		// Extract once
		const packages = extractPackages(skillFile.raw);
		const commands = extractCommands(skillFile.raw);
		const urls = extractUrls(skillFile.raw);

		let allowedToolsList: AllowedTool[] = [];
		let allowedToolsVal: unknown = skillFile.frontmatter["allowed-tools"];
		if (
			allowedToolsVal === undefined &&
			skillFile.frontmatter.metadata &&
			typeof skillFile.frontmatter.metadata === "object"
		) {
			const meta = skillFile.frontmatter.metadata as Record<string, unknown>;
			allowedToolsVal = meta["allowed-tools"];
		}
		if (typeof allowedToolsVal === "string") {
			allowedToolsList = allowedToolsVal
				.split(ALLOWED_TOOLS_SPLIT_RE)
				.filter(Boolean)
				.map((t) => {
					const match = t.match(ALLOWED_TOOL_DECLARATION_RE);
					return {
						name: match ? match[1] : t,
						constraints: match ? match[2] : undefined,
						raw: t,
					};
				});
		}

		const context: CheckContext = {
			file: skillFile,
			packages,
			commands,
			urls,
			allowedToolsList,
		};

		const fileFindings: AuditFinding[] = [];
		let fileRegistryAudit: RegistryAuditResult | undefined;

		// Run all checkers
		for (const checker of checkers) {
			const findings = await checker.check(context);
			// Filter out ignored findings
			for (const finding of findings) {
				if (!shouldIgnore(finding, ignoreRules, skillFile.raw)) {
					fileFindings.push(finding);
				}
			}
		}

		// Fetch registry audits if requested
		if (options.includeRegistryAudits) {
			const result = await fetchRegistryAudit(context);
			if (result.registryAudit) {
				fileRegistryAudit = result.registryAudit;
			}
			for (const finding of result.findings) {
				if (!shouldIgnore(finding, ignoreRules, skillFile.raw)) {
					fileFindings.push(finding);
				}
			}
		}

		return {
			findings: fileFindings,
			registryAudit: fileRegistryAudit,
		};
	});

	const allFindings: AuditFinding[] = [];
	const registryAudits: RegistryAuditResult[] = [];

	for (const res of fileResults) {
		allFindings.push(...res.findings);
		if (res.registryAudit) {
			registryAudits.push(res.registryAudit);
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
