import { writeFile } from "node:fs/promises";
import chalk from "chalk";
import { runLint } from "../lint/index.js";
import { formatLintJson } from "../lint/reporters/json.js";
import { formatLintTerminal } from "../lint/reporters/terminal.js";
import type { LintOptions } from "../lint/types.js";

interface LintCommandOptions {
	ci?: boolean;
	failOn?: string;
	fix?: boolean;
	format?: "terminal" | "json";
	output?: string;
}

const LEVEL_ORDER: Record<string, number> = {
	error: 0,
	warning: 1,
	info: 2,
};

const VALID_LEVELS = new Set(["error", "warning"]);

function meetsThreshold(level: string, threshold: string): boolean {
	return (LEVEL_ORDER[level] ?? 2) <= (LEVEL_ORDER[threshold] ?? 0);
}

export async function lintCommand(dir: string, options: LintCommandOptions): Promise<number> {
	const failOn = options.failOn ?? "error";
	if (!VALID_LEVELS.has(failOn)) {
		console.error(chalk.red(`Invalid --fail-on value: "${options.failOn}". Use: error, warning`));
		return 2;
	}

	const lintOptions: LintOptions = {
		fix: options.fix,
		ci: options.ci,
		failOn: failOn as "error" | "warning",
		format: options.format,
		output: options.output,
	};

	const report = await runLint([dir], lintOptions);

	// Format output
	const format = options.format ?? "terminal";
	let output: string;
	switch (format) {
		case "json":
			output = formatLintJson(report);
			break;
		default:
			output = formatLintTerminal(report);
			break;
	}

	// Write to file or stdout
	if (options.output) {
		await writeFile(options.output, output, "utf-8");
		console.error(chalk.green(`Report written to ${options.output}`));
	} else {
		console.log(output);
	}

	// Determine exit code based on threshold
	const hasFailingFindings = report.findings.some((f) => meetsThreshold(f.level, failOn));
	return hasFailingFindings ? 1 : 0;
}
