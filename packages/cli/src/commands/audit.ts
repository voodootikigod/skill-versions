import { writeFile } from "node:fs/promises";
import chalk from "chalk";
import { runAudit } from "../audit/index.js";
import { formatJson } from "../audit/reporters/json.js";
import { formatMarkdown } from "../audit/reporters/markdown.js";
import { formatSarif } from "../audit/reporters/sarif.js";
import { formatTerminal } from "../audit/reporters/terminal.js";
import type { AuditOptions, AuditSeverity } from "../audit/types.js";
import type { IsolationChoice } from "../isolation/types.js";

interface AuditCommandOptions {
	failOn?: string;
	format?: "terminal" | "json" | "markdown" | "sarif";
	ignore?: string;
	includeRegistryAudits?: boolean;
	isolation?: IsolationChoice | boolean;
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

	// Resolve isolation preference (--no-isolation sets it to false)
	let isolationChoice: string | undefined;
	if (options.isolation === false) {
		isolationChoice = "local";
	} else if (typeof options.isolation === "string") {
		isolationChoice = options.isolation;
	}

	// If isolation is requested and not "local", delegate to the isolation provider
	if (isolationChoice && isolationChoice !== "local") {
		const { selectProvider } = await import("../isolation/detect.js");
		const provider = await selectProvider(isolationChoice, options.verbose);

		// Warn when no isolation runtime was found and we're falling back to local
		if (provider.isFallback && !options.quiet) {
			console.error(
				chalk.yellow("Warning: No isolation runtime found. Audit will run locally (URL checks will")
			);
			console.error(
				chalk.yellow(
					"make outbound requests from this machine). Use --no-isolation to suppress this warning."
				)
			);
		}

		if (provider.name !== "local") {
			if (!options.quiet) {
				console.error(chalk.dim(`Running audit in isolated environment (${provider.name})...`));
			}

			// Rebuild the CLI command string from options
			const cmdParts = [dir];
			if (options.format) {
				cmdParts.push("--format", options.format);
			}
			if (options.output) {
				cmdParts.push("--output", options.output);
			}
			if (options.failOn) {
				cmdParts.push("--fail-on", options.failOn);
			}
			if (options.packagesOnly) {
				cmdParts.push("--packages-only");
			}
			if (options.skipUrls) {
				cmdParts.push("--skip-urls");
			}
			if (options.uniqueOnly) {
				cmdParts.push("--unique-only");
			}
			if (options.includeRegistryAudits) {
				cmdParts.push("--include-registry-audits");
			}
			if (options.ignore) {
				cmdParts.push("--ignore", options.ignore);
			}
			if (options.verbose) {
				cmdParts.push("--verbose");
			}
			if (options.quiet) {
				cmdParts.push("--quiet");
			}
			cmdParts.push("--no-isolation"); // Prevent recursion inside the container

			const result = await provider.execute({
				command: `audit ${cmdParts.join(" ")}`,
				skillsDir: dir,
				timeout: 300,
				networkAccess: !options.skipUrls, // URL checks need network
				env: {},
			});

			if (result.stdout) {
				console.log(result.stdout);
			}
			if (result.stderr) {
				console.error(result.stderr);
			}
			return result.exitCode;
		}
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
