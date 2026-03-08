import chalk from "chalk";
import type { UsageOptions } from "../usage/index.js";
import { runUsage } from "../usage/index.js";
import { formatUsageJson, formatUsageJsonWithPolicy } from "../usage/reporters/json.js";
import {
	formatUsageMarkdown,
	formatUsageMarkdownWithPolicy,
} from "../usage/reporters/markdown.js";
import {
	formatUsageTerminal,
	formatUsageTerminalWithPolicy,
} from "../usage/reporters/terminal.js";

interface UsageCommandOptions {
	checkPolicy?: boolean;
	ci?: boolean;
	detailed?: boolean;
	failOn?: string;
	format?: "terminal" | "json" | "markdown";
	json?: boolean;
	markdown?: boolean;
	output?: string;
	policy?: string;
	quiet?: boolean;
	since?: string;
	store?: string;
	until?: string;
	verbose?: boolean;
}

export async function usageCommand(options: UsageCommandOptions): Promise<number> {
	if (options.verbose && options.quiet) {
		console.error(chalk.red("Cannot use --verbose and --quiet together."));
		return 2;
	}

	const usageOptions: UsageOptions = {
		store: options.store,
		since: options.since,
		until: options.until,
		detailed: options.detailed,
		checkPolicy: options.checkPolicy,
		json: options.json,
		markdown: options.markdown,
		ci: options.ci,
		failOn: options.failOn,
		output: options.output,
		policyFile: options.policy,
	};

	const { report, violations } = await runUsage(usageOptions);

	// Determine format
	const format = options.json ? "json" : options.markdown ? "markdown" : (options.format ?? "terminal");

	// Format output
	let output: string;
	if (format === "json") {
		output = violations.length > 0
			? formatUsageJsonWithPolicy(report, violations)
			: formatUsageJson(report);
	} else if (format === "markdown") {
		output = violations.length > 0
			? formatUsageMarkdownWithPolicy(report, violations)
			: formatUsageMarkdown(report);
	} else {
		output = violations.length > 0
			? formatUsageTerminalWithPolicy(report, violations)
			: formatUsageTerminal(report);
	}

	if (!options.quiet) {
		if (options.output) {
			const { writeFile } = await import("node:fs/promises");
			await writeFile(options.output, output, "utf-8");
		} else {
			console.log(output);
		}
	}

	// Exit code
	if (options.checkPolicy && violations.length > 0) {
		return 1;
	}
	return 0;
}
