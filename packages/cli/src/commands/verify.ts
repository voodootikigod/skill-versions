import { writeFile } from "node:fs/promises";
import chalk from "chalk";
import { runVerify } from "../verify/index.js";
import { formatVerifyJson } from "../verify/reporters/json.js";
import { formatVerifyTerminal } from "../verify/reporters/terminal.js";
import type { VerifyOptions } from "../verify/types.js";

interface VerifyCommandOptions {
	skill?: string;
	all?: boolean;
	before?: string;
	after?: string;
	suggest?: boolean;
	format?: "terminal" | "json";
	output?: string;
	provider?: string;
	model?: string;
	skipLlm?: boolean;
	verbose?: boolean;
	quiet?: boolean;
}

export async function verifyCommand(options: VerifyCommandOptions): Promise<number> {
	if (options.verbose && options.quiet) {
		console.error(chalk.red("Cannot use --verbose and --quiet together"));
		return 2;
	}

	if (options.before && !options.after) {
		console.error(chalk.red("--before requires --after"));
		return 2;
	}

	if (options.after && !options.before) {
		console.error(chalk.red("--after requires --before"));
		return 2;
	}

	if (!options.before && !options.after && !options.skill && !options.all) {
		console.error(chalk.red("Specify --skill <path>, --all, or --before/--after for comparison"));
		return 2;
	}

	if (options.verbose) {
		if (options.before && options.after) {
			console.error(chalk.dim(`Comparing: ${options.before} -> ${options.after}`));
		} else if (options.skill) {
			console.error(chalk.dim(`Verifying: ${options.skill}`));
		} else {
			console.error(chalk.dim("Verifying all skills..."));
		}
		if (options.skipLlm) console.error(chalk.dim("LLM analysis disabled"));
	}

	const verifyOptions: VerifyOptions = {
		skill: options.skill,
		all: options.all,
		before: options.before,
		after: options.after,
		suggest: options.suggest,
		format: options.format,
		output: options.output,
		provider: options.provider,
		model: options.model,
		skipLlm: options.skipLlm,
	};

	const report = await runVerify(verifyOptions);

	if (options.verbose) {
		console.error(
			chalk.dim(
				`Verified ${report.results.length} skill(s): ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped`,
			),
		);
	}

	// Format output
	const format = options.format ?? "terminal";
	let output: string;
	switch (format) {
		case "json":
			output = formatVerifyJson(report);
			break;
		default:
			output = formatVerifyTerminal(report);
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

	// Exit code: 1 if any mismatches found
	return report.summary.failed > 0 ? 1 : 0;
}
