import { writeFile } from "node:fs/promises";
import chalk from "chalk";
import { compareSnapshots, loadSnapshot, saveSnapshot } from "../budget/comparison.js";
import { getAvailableModels } from "../budget/cost.js";
import { runBudget } from "../budget/index.js";
import { formatComparisonJson, formatJson } from "../budget/reporters/json.js";
import { formatComparisonMarkdown, formatMarkdown } from "../budget/reporters/markdown.js";
import { formatComparisonTerminal, formatTerminal } from "../budget/reporters/terminal.js";
import type { BudgetOptions } from "../budget/types.js";

interface BudgetCommandOptions {
	compare?: string;
	detailed?: boolean;
	format?: "terminal" | "json" | "markdown";
	maxTokens?: string;
	model?: string;
	output?: string;
	save?: string;
	skill?: string;
}

export async function budgetCommand(dir: string, options: BudgetCommandOptions): Promise<number> {
	// Validate model if provided
	if (options.model) {
		const available = getAvailableModels();
		if (!available.includes(options.model)) {
			console.error(
				chalk.red(`Unknown model: "${options.model}". Available: ${available.join(", ")}`)
			);
			return 2;
		}
	}

	// Validate maxTokens if provided
	const maxTokens = options.maxTokens ? Number.parseInt(options.maxTokens, 10) : undefined;
	if (
		options.maxTokens !== undefined &&
		(Number.isNaN(maxTokens) || (maxTokens !== undefined && maxTokens <= 0))
	) {
		console.error(
			chalk.red(`Invalid --max-tokens value: "${options.maxTokens}". Must be a positive integer.`)
		);
		return 2;
	}

	// Handle comparison mode
	if (options.compare) {
		return handleComparison(dir, options);
	}

	const budgetOptions: BudgetOptions = {
		skill: options.skill,
		detailed: options.detailed,
		format: options.format,
		output: options.output,
		maxTokens,
		save: options.save,
		model: options.model,
	};

	const report = await runBudget([dir], budgetOptions);

	// Save snapshot if requested
	if (options.save) {
		await saveSnapshot(report, options.save);
		console.error(chalk.green(`Snapshot saved to ${options.save}`));
	}

	// Format output
	const format = options.format ?? "terminal";
	let output: string;
	switch (format) {
		case "json":
			output = formatJson(report);
			break;
		case "markdown":
			output = formatMarkdown(report, options.detailed);
			break;
		default:
			output = formatTerminal(report, options.detailed);
			break;
	}

	// Write to file or stdout
	if (options.output) {
		await writeFile(options.output, output, "utf-8");
		console.error(chalk.green(`Report written to ${options.output}`));
	} else {
		console.log(output);
	}

	// Check max-tokens threshold
	if (maxTokens !== undefined && report.totalTokens > maxTokens) {
		console.error(
			chalk.red(
				`Budget exceeded: ${report.totalTokens.toLocaleString()} tokens > ${maxTokens.toLocaleString()} max`
			)
		);
		return 1;
	}

	return 0;
}

async function handleComparison(dir: string, options: BudgetCommandOptions): Promise<number> {
	const snapshotPath = options.compare ?? "";

	// Load the baseline snapshot
	let baseline: Awaited<ReturnType<typeof loadSnapshot>> | undefined;
	try {
		baseline = await loadSnapshot(snapshotPath);
	} catch {
		console.error(chalk.red(`Cannot load snapshot: ${snapshotPath}`));
		return 2;
	}

	// Run current budget
	const report = await runBudget([dir], { skill: options.skill, model: options.model });

	// Compare
	const currentSnapshot = {
		skills: report.skills,
		totalTokens: report.totalTokens,
		model: report.cost.model,
		generatedAt: report.generatedAt,
	};

	const diffs = compareSnapshots(baseline, currentSnapshot);

	// Format output
	const format = options.format ?? "terminal";
	let output: string;
	switch (format) {
		case "json":
			output = formatComparisonJson(diffs);
			break;
		case "markdown":
			output = formatComparisonMarkdown(diffs);
			break;
		default:
			output = formatComparisonTerminal(diffs);
			break;
	}

	// Write to file or stdout
	if (options.output) {
		await writeFile(options.output, output, "utf-8");
		console.error(chalk.green(`Comparison written to ${options.output}`));
	} else {
		console.log(output);
	}

	return 0;
}
