import chalk from "chalk";
import { diffLines } from "diff";

const TRAILING_NEWLINE_RE = /\n$/;

/**
 * Generate a colored diff between two strings.
 * Returns the formatted diff string for terminal output.
 */
export function formatDiff(oldContent: string, newContent: string, filePath?: string): string {
	const changes = diffLines(oldContent, newContent);
	const lines: string[] = [];

	if (filePath) {
		lines.push(chalk.bold(`--- ${filePath}`));
		lines.push(chalk.bold(`+++ ${filePath} (updated)`));
		lines.push("");
	}

	for (const change of changes) {
		const text = change.value.replace(TRAILING_NEWLINE_RE, "");
		const textLines = text.split("\n");

		for (const line of textLines) {
			if (change.added) {
				lines.push(chalk.green(`+ ${line}`));
			} else if (change.removed) {
				lines.push(chalk.red(`- ${line}`));
			} else {
				lines.push(chalk.dim(`  ${line}`));
			}
		}
	}

	return lines.join("\n");
}

/**
 * Count the number of additions and removals in a diff.
 */
export function diffStats(
	oldContent: string,
	newContent: string
): { additions: number; removals: number } {
	const changes = diffLines(oldContent, newContent);
	let additions = 0;
	let removals = 0;

	for (const change of changes) {
		const count = change.value.split("\n").length - 1;
		if (change.added) {
			additions += count;
		}
		if (change.removed) {
			removals += count;
		}
	}

	return { additions, removals };
}
