import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import type { IsolationChoice } from "../isolation/types.js";
import { runTests } from "../testing/index.js";
import { formatJson } from "../testing/reporters/json.js";
import { formatMarkdown } from "../testing/reporters/markdown.js";
import { formatTestSarif } from "../testing/reporters/sarif.js";
import { formatTerminal } from "../testing/reporters/terminal.js";
import type { TestOptions } from "../testing/types.js";

/**
 * Resolve the local CLI package root for mounting into containers.
 * Uses import.meta.url to find the dist directory relative to the current module.
 */
function getLocalBuildPath(): string {
	const currentDir = dirname(fileURLToPath(import.meta.url));
	// commands/ is inside src/ or dist/ — go up to the package root
	return resolve(currentDir, "..", "..");
}

interface TestCommandOptions {
	agent?: string;
	agentCmd?: string;
	allowCustomGraders?: boolean;
	allowUnsafeLocal?: boolean;
	ci?: boolean;
	dry?: boolean;
	format?: "terminal" | "json" | "markdown" | "sarif";
	isolation?: IsolationChoice | boolean;
	maxCost?: string;
	model?: string;
	output?: string;
	passThreshold?: string;
	provider?: string;
	quiet?: boolean;
	skill?: string;
	timeout?: string;
	trials?: string;
	type?: string;
	updateBaseline?: boolean;
	verbose?: boolean;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
export async function testCommand(dir: string, options: TestCommandOptions): Promise<number> {
	if (options.verbose && options.quiet) {
		console.error(chalk.red("Cannot use --verbose and --quiet together."));
		return 2;
	}

	const testOptions: TestOptions = {
		skill: options.skill,
		type: options.type,
		agent: options.agent,
		agentCmd: options.agentCmd,
		format: (options.format ?? "terminal") as TestOptions["format"],
		output: options.output,
		trials: options.trials ? Number.parseInt(options.trials, 10) : undefined,
		passThreshold: options.passThreshold ? Number.parseInt(options.passThreshold, 10) : undefined,
		timeout: options.timeout ? Number.parseInt(options.timeout, 10) : undefined,
		maxCost: options.maxCost ? Number.parseFloat(options.maxCost) : undefined,
		dry: options.dry,
		updateBaseline: options.updateBaseline,
		ci: options.ci,
		provider: options.provider,
		model: options.model,
		verbose: options.verbose,
		allowCustomGraders: options.allowCustomGraders,
	};

	// Resolve isolation preference (--no-isolation sets it to false)
	let isolationChoice: string | undefined;
	if (options.isolation === false) {
		isolationChoice = "local";
	} else if (typeof options.isolation === "string") {
		isolationChoice = options.isolation;
	}

	const isCI =
		options.ci ||
		(process.env.CI !== undefined &&
			process.env.CI !== "false" &&
			process.env.CI !== "0" &&
			process.env.CI !== "");

	// In CI, explicit --no-isolation requires --allow-unsafe-local
	if (isCI && isolationChoice === "local" && !options.allowUnsafeLocal) {
		console.error(
			chalk.red(
				"\n  Error: --no-isolation in CI requires --allow-unsafe-local to confirm the risk.\n"
			)
		);
		return 2;
	}

	// If isolation is requested and not "local", delegate to the isolation provider
	if (isolationChoice && isolationChoice !== "local") {
		const { selectProvider } = await import("../isolation/detect.js");
		const provider = await selectProvider(isolationChoice as IsolationChoice, options.verbose);

		// Warn when no isolation runtime was found and we're falling back to local
		if (provider.isFallback) {
			console.error(
				chalk.yellow.bold(
					"\n  Warning: No isolation runtime found (Docker, Podman, OrbStack, Apple Containers, etc.)"
				)
			);
			console.error(
				chalk.yellow(
					"  The test command executes agent harnesses that run arbitrary shell commands."
				)
			);
			console.error(
				chalk.yellow("  Running without isolation means tests execute directly on your machine")
			);
			console.error(
				chalk.yellow(
					"  and could modify files, make network requests, or run destructive commands.\n"
				)
			);

			if (isCI) {
				// In CI: fail closed unless explicitly overridden
				if (!options.allowUnsafeLocal) {
					console.error(
						chalk.red("  CI mode requires isolation. Pass --allow-unsafe-local to override.\n")
					);
					return 2;
				}
				console.error(chalk.yellow("  --allow-unsafe-local: running without isolation in CI.\n"));
			} else {
				// Interactive: require --no-isolation
				console.error(
					chalk.yellow(
						"  To proceed without isolation, re-run with --no-isolation to accept the risk.\n"
					)
				);
				return 2;
			}
		}

		if (provider.name !== "local") {
			if (options.verbose) {
				console.error(chalk.dim(`Running tests in isolated environment (${provider.name})...`));
			}

			// Build structured argv array instead of a command string
			const argv: string[] = ["test", dir];
			if (options.skill) {
				argv.push("--skill", options.skill);
			}
			if (options.type) {
				argv.push("--type", options.type);
			}
			if (options.agent) {
				argv.push("--agent", options.agent);
			}
			if (options.agentCmd) {
				argv.push("--agent-cmd", options.agentCmd);
			}
			if (options.format) {
				argv.push("--format", options.format);
			}
			if (options.output) {
				argv.push("--output", options.output);
			}
			if (options.trials) {
				argv.push("--trials", options.trials);
			}
			if (options.passThreshold) {
				argv.push("--pass-threshold", options.passThreshold);
			}
			if (options.timeout) {
				argv.push("--timeout", options.timeout);
			}
			if (options.maxCost) {
				argv.push("--max-cost", options.maxCost);
			}
			if (options.dry) {
				argv.push("--dry");
			}
			if (options.updateBaseline) {
				argv.push("--update-baseline");
			}
			if (options.ci) {
				argv.push("--ci");
			}
			if (options.provider) {
				argv.push("--provider", options.provider);
			}
			if (options.model) {
				argv.push("--model", options.model);
			}
			if (options.allowCustomGraders) {
				argv.push("--allow-custom-graders");
			}
			if (options.verbose) {
				argv.push("--verbose");
			}
			argv.push("--no-isolation"); // Prevent recursion inside the container

			// Resolve local build path for mounting into the container
			const localBuildPath = getLocalBuildPath();

			// Forward LLM API keys for rubric grading
			const env: Record<string, string> = {};
			for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]) {
				const val = process.env[key];
				if (val) {
					env[key] = val;
				}
			}

			const result = await provider.execute({
				argv,
				command: `test ${argv.slice(1).join(" ")}`, // backward compat
				localBuild: localBuildPath,
				skillsDir: dir,
				workDir: dir,
				timeout: options.timeout ? Number.parseInt(options.timeout, 10) * 2 : 600,
				networkAccess: true, // Tests may need network for agent harnesses
				env,
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
		console.error(chalk.dim(`Testing: ${dir}`));
		if (options.skill) {
			console.error(chalk.dim(`Skill filter: ${options.skill}`));
		}
		if (options.type) {
			console.error(chalk.dim(`Type filter: ${options.type}`));
		}
		if (options.agent) {
			console.error(chalk.dim(`Agent: ${options.agent}`));
		}
		if (options.dry) {
			console.error(chalk.dim("Mode: dry run"));
		}
	}

	const { reports, baselineDiffs, costEstimate } = await runTests(dir, testOptions);

	// Dry run: show test plan and cost estimate
	if (options.dry) {
		console.log(chalk.bold("\nTest Plan (dry run)"));
		console.log("=".repeat(50));

		for (const report of reports) {
			console.log(`\n${chalk.bold(report.suite)} (${report.skillPath})`);
			for (const c of report.cases) {
				console.log(`  - ${c.caseId} (${c.type})`);
			}
		}

		if (costEstimate) {
			console.log(`\n${chalk.bold("Estimated cost:")} $${costEstimate.totalEstimatedCost}`);
			for (const s of costEstimate.perSuite) {
				console.log(
					`  ${s.suiteName}: $${s.estimatedCost} (${s.caseCount} cases x ${s.trials} trials)`
				);
			}
		}

		console.log("");
		return 0;
	}

	// Format output
	const format = options.format ?? "terminal";
	let output: string;

	switch (format) {
		case "json":
			output = formatJson(reports);
			break;
		case "markdown":
			output = formatMarkdown(reports, baselineDiffs);
			break;
		case "sarif":
			output = formatTestSarif(reports);
			break;
		default:
			output = formatTerminal(reports, {
				verbose: options.verbose,
				baselineDiffs,
			});
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

	// Determine exit code
	const totalFailed = reports.reduce((s, r) => s + r.failed, 0);
	const hasRegressions = [...baselineDiffs.values()].some((d) => d.regressions.length > 0);

	if (totalFailed > 0) {
		return 1;
	}
	if (options.ci && hasRegressions) {
		return 1;
	}
	return 0;
}
