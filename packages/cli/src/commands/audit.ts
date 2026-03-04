import { writeFile } from "node:fs/promises";
import chalk from "chalk";
import { runAudit } from "../audit/index.js";
import { formatJson } from "../audit/reporters/json.js";
import { formatMarkdown } from "../audit/reporters/markdown.js";
import { formatSarif } from "../audit/reporters/sarif.js";
import { formatTerminal } from "../audit/reporters/terminal.js";
import type { AuditOptions, AuditSeverity } from "../audit/types.js";

interface AuditCommandOptions {
	failOn?: string;
	format?: "terminal" | "json" | "markdown" | "sarif";
	ignore?: string;
	includeRegistryAudits?: boolean;
	output?: string;
	packagesOnly?: boolean;
	quiet?: boolean;
	skipUrls?: boolean;
	uniqueOnly?: boolean;
	verbose?: boolean;
}

const SEVERITY_ORDER: Record<AuditSeverity, number> = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3,
};

const VALID_SEVERITIES = new Set(["critical", "high", "medium", "low"]);

function meetsThreshold(severity: AuditSeverity, threshold: AuditSeverity): boolean {
	return SEVERITY_ORDER[severity] <= SEVERITY_ORDER[threshold];
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
export async function auditCommand(dir: string, options: AuditCommandOptions): Promise<number> {
	if (options.verbose && options.quiet) {
		console.error(chalk.red("Cannot use --verbose and --quiet together"));
		return 2;
	}

	const failOn = (options.failOn ?? "high") as AuditSeverity;
	if (!VALID_SEVERITIES.has(failOn)) {
		console.error(
			chalk.red(`Invalid --fail-on value: "${options.failOn}". Use: critical, high, medium, low`)
		);
		return 2;
	}

	if (options.verbose) {
		console.error(chalk.dim(`Auditing: ${dir}`));
		console.error(chalk.dim(`Threshold: ${failOn}`));
		if (options.packagesOnly) {
			console.error(chalk.dim("Mode: packages-only"));
		}
		if (options.uniqueOnly) {
			console.error(chalk.dim("Mode: unique-only (skipping injection/command checkers)"));
		}
		if (options.includeRegistryAudits) {
			console.error(chalk.dim("Including skills.sh registry audits"));
		}
		if (options.skipUrls) {
			console.error(chalk.dim("Skipping URL liveness checks"));
		}
		if (options.ignore) {
			console.error(chalk.dim(`Ignore file: ${options.ignore}`));
		}
	}

	const auditOptions: AuditOptions = {
		format: options.format,
		output: options.output,
		failOn,
		packagesOnly: options.packagesOnly,
		skipUrls: options.skipUrls,
		ignorePath: options.ignore,
		uniqueOnly: options.uniqueOnly,
		includeRegistryAudits: options.includeRegistryAudits,
	};

	const report = await runAudit([dir], auditOptions);

	if (options.verbose) {
		console.error(
			chalk.dim(`Scanned ${report.files} file(s), found ${report.summary.total} finding(s)`)
		);
	}

	// Format output
	const format = options.format ?? "terminal";
	let output: string;
	switch (format) {
		case "json":
			output = formatJson(report);
			break;
		case "markdown":
			output = formatMarkdown(report);
			break;
		case "sarif":
			output = formatSarif(report);
			break;
		default:
			output = formatTerminal(report);
			break;
	}

	// Write to file or stdout
	if (options.output) {
		await writeFile(options.output, output, "utf-8");
		if (!options.quiet) {
			console.error(chalk.green(`Report written to ${options.output}`));
		}
	} else if (!options.quiet) {
		console.log(output);
	}

	// Determine exit code based on threshold
	const hasFailingFindings = report.findings.some((f) => meetsThreshold(f.severity, failOn));
	return hasFailingFindings ? 1 : 0;
}
