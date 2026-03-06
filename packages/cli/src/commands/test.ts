import { writeFile } from "node:fs/promises";
import chalk from "chalk";
import type { IsolationChoice } from "../isolation/types.js";
import { runTests } from "../testing/index.js";
import { formatJson } from "../testing/reporters/json.js";
import { formatMarkdown } from "../testing/reporters/markdown.js";
import { formatTerminal } from "../testing/reporters/terminal.js";
import type { TestOptions } from "../testing/types.js";

interface TestCommandOptions {
	agent?: string;
	agentCmd?: string;
	ci?: boolean;
	dry?: boolean;
	format?: "terminal" | "json" | "markdown";
	isolation?: IsolationChoice | boolean;
	maxCost?: string;
	model?: string;
	output?: string;
	passThreshold?: string;
	provider?: string;
	skill?: string;
	timeout?: string;
	trials?: string;
	type?: string;
	updateBaseline?: boolean;
	verbose?: boolean;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
export async function testCommand(dir: string, options: TestCommandOptions): Promise<number> {
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
	};

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

			// In CI mode, proceed with a warning (CI has its own sandboxing)
			// In interactive mode, require --no-isolation to explicitly accept the risk
			if (!options.ci) {
				console.error(
					chalk.yellow(
						"  To proceed without isolation, re-run with --no-isolation to accept the risk.\n"
					)
				);
				return 2;
			}
			console.error(chalk.dim("  Continuing in CI mode without isolation.\n"));
		}

		if (provider.name !== "local") {
			if (options.verbose) {
				console.error(chalk.dim(`Running tests in isolated environment (${provider.name})...`));
			}

			// Rebuild the CLI command string from options
			const cmdParts = [dir];
			if (options.skill) {
				cmdParts.push("--skill", options.skill);
			}
			if (options.type) {
				cmdParts.push("--type", options.type);
			}
			if (options.agent) {
				cmdParts.push("--agent", options.agent);
			}
			if (options.agentCmd) {
				cmdParts.push("--agent-cmd", `"${options.agentCmd}"`);
			}
			if (options.format) {
				cmdParts.push("--format", options.format);
			}
			if (options.output) {
				cmdParts.push("--output", options.output);
			}
			if (options.trials) {
				cmdParts.push("--trials", options.trials);
			}
			if (options.passThreshold) {
				cmdParts.push("--pass-threshold", options.passThreshold);
			}
			if (options.timeout) {
				cmdParts.push("--timeout", options.timeout);
			}
			if (options.maxCost) {
				cmdParts.push("--max-cost", options.maxCost);
			}
			if (options.dry) {
				cmdParts.push("--dry");
			}
			if (options.updateBaseline) {
				cmdParts.push("--update-baseline");
			}
			if (options.ci) {
				cmdParts.push("--ci");
			}
			if (options.provider) {
				cmdParts.push("--provider", options.provider);
			}
			if (options.model) {
				cmdParts.push("--model", options.model);
			}
			if (options.verbose) {
				cmdParts.push("--verbose");
			}
			cmdParts.push("--no-isolation"); // Prevent recursion inside the container

			// Forward LLM API keys for rubric grading
			const env: Record<string, string> = {};
			for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]) {
				const val = process.env[key];
				if (val) {
					env[key] = val;
				}
			}

			const result = await provider.execute({
				command: `test ${cmdParts.join(" ")}`,
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
		console.error(chalk.green(`Report written to ${options.output}`));
	} else {
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
