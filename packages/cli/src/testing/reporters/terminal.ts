import chalk from "chalk";
import type { BaselineDiff, TestReport } from "../types.js";

/**
 * Format test results for terminal output with colors and icons.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
export function formatTerminal(
	reports: TestReport[],
	options?: { verbose?: boolean; baselineDiffs?: Map<string, BaselineDiff> }
): string {
	const lines: string[] = [];

	lines.push("");
	lines.push(chalk.bold("skills-check test"));
	lines.push("=".repeat(50));
	lines.push("");

	if (reports.length === 0) {
		lines.push(chalk.yellow("No testable skills found."));
		lines.push("");
		return lines.join("\n");
	}

	let totalPassed = 0;
	let totalFailed = 0;
	let totalSkipped = 0;
	let totalFlaky = 0;

	for (const report of reports) {
		lines.push(chalk.bold.underline(`${report.suite} (${report.skillPath})`));
		lines.push("");

		for (const c of report.cases) {
			const icon = c.passed ? chalk.green("PASS") : chalk.red("FAIL");
			const flaky = c.flaky ? chalk.yellow(" [FLAKY]") : "";
			const rate = `${Math.round(c.passRate * 100)}%`;

			lines.push(`  ${icon} ${c.caseId} (${c.type}) ${chalk.dim(`[${rate}]`)}${flaky}`);

			if (options?.verbose && c.trials.length > 0) {
				for (const trial of c.trials) {
					const tIcon = trial.passed ? chalk.green("  +") : chalk.red("  -");
					lines.push(`    ${tIcon} Trial ${trial.trial} (${trial.duration}ms)`);

					if (trial.error) {
						lines.push(`      ${chalk.red(trial.error)}`);
					}

					for (const gr of trial.graderResults) {
						const gIcon = gr.passed ? chalk.green("    [ok]") : chalk.red("    [!!]");
						lines.push(`${gIcon} ${gr.grader}: ${gr.message}`);
						if (gr.detail && !gr.passed) {
							lines.push(`          ${chalk.dim(gr.detail)}`);
						}
					}
				}
			}

			if (c.passed) {
				totalPassed++;
			} else {
				totalFailed++;
			}
			if (c.flaky) {
				totalFlaky++;
			}
		}

		totalSkipped += report.skipped;

		// Baseline comparison
		const diff = options?.baselineDiffs?.get(report.skillPath);
		if (diff) {
			if (diff.regressions.length > 0) {
				lines.push("");
				lines.push(chalk.red.bold("  Regressions:"));
				for (const r of diff.regressions) {
					lines.push(
						chalk.red(
							`    ${r.caseId}: ${Math.round(r.wasPassRate * 100)}% -> ${Math.round(r.nowPassRate * 100)}%`
						)
					);
				}
			}
			if (diff.improvements.length > 0) {
				lines.push("");
				lines.push(chalk.green.bold("  Improvements:"));
				for (const imp of diff.improvements) {
					lines.push(
						chalk.green(
							`    ${imp.caseId}: ${Math.round(imp.wasPassRate * 100)}% -> ${Math.round(imp.nowPassRate * 100)}%`
						)
					);
				}
			}
		}

		lines.push("");
	}

	// Summary
	lines.push(chalk.bold("Summary"));
	lines.push("=".repeat(50));
	lines.push(chalk.green(`  Passed:  ${totalPassed}`));
	if (totalFailed > 0) {
		lines.push(chalk.red(`  Failed:  ${totalFailed}`));
	}
	if (totalSkipped > 0) {
		lines.push(chalk.yellow(`  Skipped: ${totalSkipped}`));
	}
	if (totalFlaky > 0) {
		lines.push(chalk.yellow(`  Flaky:   ${totalFlaky}`));
	}

	const totalDuration = reports.reduce((sum, r) => sum + r.totalDuration, 0);
	lines.push(`  Time:    ${(totalDuration / 1000).toFixed(1)}s`);
	lines.push("");

	return lines.join("\n");
}
