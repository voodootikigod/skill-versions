import { writeFile } from "node:fs/promises";
import chalk from "chalk";
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
