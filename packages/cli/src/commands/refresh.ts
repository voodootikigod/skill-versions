import { join } from "node:path";
import { createInterface } from "node:readline";
import { generateObject } from "ai";
import chalk from "chalk";
import matter from "gray-matter";
import { fetchChangelog } from "../changelog.js";
import { diffStats, formatDiff } from "../diff.js";
import { buildSystemPrompt, buildUserPrompt } from "../llm/prompts.js";
import { resolveModel } from "../llm/providers.js";
import { RefreshResultSchema } from "../llm/schemas.js";
import { fetchLatestVersions } from "../npm.js";
import { loadRegistry, saveRegistry } from "../registry.js";
import { getSeverity, normalizeVersion } from "../severity.js";
import { readSkillFile, writeSkillFile } from "../skill-io.js";
import type { CheckResult } from "../types.js";

function getRefreshSeverityColor(severity: string) {
	return severity === "minor" ? chalk.yellow : chalk.blue;
}

interface RefreshOptions {
	dryRun?: boolean;
	model?: string;
	product?: string;
	provider?: string;
	registry?: string;
	yes?: boolean;
}

/**
 * Refresh stale skill files using an LLM to propose targeted updates.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
export async function refreshCommand(
	skillsDir: string | undefined,
	options: RefreshOptions
): Promise<number> {
	// Load registry
	const registry = await loadRegistry(options.registry);

	// Resolve skills directory: CLI arg > registry field > default
	const resolvedSkillsDir = skillsDir ?? registry.skillsDir ?? "./skills";

	// Filter to single product if requested
	const productEntries = Object.entries(registry.products).filter(
		([key]) => !options.product || key === options.product
	);

	if (options.product && productEntries.length === 0) {
		console.error(chalk.red(`Product "${options.product}" not found in registry.`));
		return 2;
	}

	// Fetch latest versions
	const packageNames = productEntries.map(([, p]) => p.package);
	const latestVersions = await fetchLatestVersions(packageNames);

	// Build stale results
	const staleResults: CheckResult[] = [];

	for (const [key, product] of productEntries) {
		// Skip platform-versioned products
		if (product.verifiedVersion === "platform") {
			console.log(chalk.dim(`  Skipping "${product.displayName}" (platform-versioned)`));
			continue;
		}

		const latest = latestVersions.get(product.package);

		if (latest instanceof Error) {
			console.error(chalk.yellow(`  Warning: ${latest.message}`));
			continue;
		}

		if (!latest) {
			console.error(chalk.yellow(`  Warning: No version data for "${product.package}"`));
			continue;
		}

		const verifiedNorm = normalizeVersion(product.verifiedVersion);
		const latestNorm = normalizeVersion(latest);

		if (!(verifiedNorm && latestNorm)) {
			continue;
		}

		const severity = getSeverity(verifiedNorm.version, latestNorm.version);
		if (severity === "current") {
			continue;
		}

		staleResults.push({
			product: key,
			displayName: product.displayName,
			package: product.package,
			verifiedVersion: product.verifiedVersion,
			latestVersion: latest,
			skills: product.skills,
			changelog: product.changelog,
			stale: true,
			severity,
		});
	}

	if (staleResults.length === 0) {
		console.log(chalk.green("\nAll products are current. Nothing to refresh."));
		return 0;
	}

	console.log(chalk.bold(`\nFound ${staleResults.length} stale product(s) to refresh:\n`));
	for (const result of staleResults) {
		const severityColor =
			result.severity === "major" ? chalk.red : getRefreshSeverityColor(result.severity);
		console.log(
			`  ${chalk.bold(result.displayName.padEnd(24))} ${result.verifiedVersion} ${chalk.dim("→")} ${severityColor(result.latestVersion)} ${chalk.dim(`(${result.severity})`)}`
		);
	}
	console.log();

	// Resolve LLM model
	console.log(chalk.dim("Resolving LLM provider..."));
	const model = await resolveModel(options.provider, options.model);
	console.log(chalk.dim(`Using model: ${options.model ?? "default"}\n`));

	// Process each stale product
	const systemPrompt = buildSystemPrompt();
	let totalApplied = 0;
	let totalSkipped = 0;
	let applyAll = options.yes;

	for (const result of staleResults) {
		console.log(chalk.bold.underline(`\n${result.displayName}`));
		console.log(
			chalk.dim(`  ${result.package}: ${result.verifiedVersion} → ${result.latestVersion}`)
		);

		// Fetch changelog
		console.log(chalk.dim("  Fetching changelog..."));
		const changelog = await fetchChangelog(
			result.package,
			result.verifiedVersion,
			result.latestVersion,
			result.changelog
		);

		if (changelog) {
			console.log(chalk.dim(`  Changelog found (${changelog.length} chars)`));
		} else {
			console.log(chalk.dim("  No changelog found — LLM will proceed with low confidence"));
		}

		// Process each skill file for this product
		const product = registry.products[result.product];

		for (const skillName of product.skills) {
			const skillPath = join(resolvedSkillsDir, skillName, "SKILL.md");

			let skillFile: Awaited<ReturnType<typeof readSkillFile>>;
			try {
				skillFile = await readSkillFile(skillPath);
			} catch {
				console.error(chalk.yellow(`  Could not read ${skillPath}, skipping`));
				continue;
			}

			console.log(chalk.dim(`\n  Processing: ${skillPath}`));
			console.log(chalk.dim("  Calling LLM..."));

			// Call LLM
			const { object: llmResult } = await generateObject({
				model,
				schema: RefreshResultSchema,
				system: systemPrompt,
				prompt: buildUserPrompt({
					skillContent: skillFile.raw,
					displayName: result.displayName,
					fromVersion: result.verifiedVersion,
					toVersion: result.latestVersion,
					changelog,
				}),
			});

			// Display results
			console.log();
			console.log(`  ${chalk.bold("Summary:")} ${llmResult.summary}`);
			console.log(
				`  ${chalk.bold("Confidence:")} ${confidenceColor(llmResult.confidence)(llmResult.confidence)}`
			);
			if (llmResult.breakingChanges) {
				console.log(`  ${chalk.red.bold("⚠ Breaking changes detected")}`);
			}

			if (llmResult.changes.length > 0) {
				console.log(`  ${chalk.bold("Changes:")}`);
				for (const change of llmResult.changes) {
					console.log(`    • ${chalk.cyan(change.section)}: ${change.description}`);
				}
			}

			// Show diff
			const stats = diffStats(skillFile.raw, llmResult.updatedContent);
			if (stats.additions === 0 && stats.removals === 0) {
				console.log(chalk.dim("\n  No changes detected."));
				continue;
			}

			console.log(
				`\n  ${chalk.green(`+${stats.additions}`)} ${chalk.red(`-${stats.removals}`)} lines changed\n`
			);
			console.log(formatDiff(skillFile.raw, llmResult.updatedContent, skillPath));

			// Apply or skip
			if (options.dryRun) {
				console.log(chalk.dim("\n  --dry-run: changes not applied"));
				totalSkipped++;
				continue;
			}

			let shouldApply = applyAll;

			if (!shouldApply) {
				const answer = await promptUser(
					"\n  Apply this change? [y]es / [n]o / [a]ll / [s]kip product: "
				);

				if (answer === "a") {
					applyAll = true;
					shouldApply = true;
				} else if (answer === "y") {
					shouldApply = true;
				} else if (answer === "s") {
					console.log(chalk.dim("  Skipping remaining skills for this product"));
					totalSkipped += product.skills.length;
					break;
				} else {
					shouldApply = false;
				}
			}

			if (shouldApply) {
				await writeSkillFile(skillPath, llmResult.updatedContent);

				// Verify the LLM actually bumped the frontmatter product-version
				const written = await readSkillFile(skillPath);
				const writtenVersion = written.frontmatter["product-version"] as string | undefined;

				if (writtenVersion !== result.latestVersion) {
					console.log(
						chalk.yellow(
							`  ⚠ LLM did not bump product-version (got "${writtenVersion ?? "missing"}", expected "${result.latestVersion}") — patching`
						)
					);
					written.frontmatter["product-version"] = result.latestVersion;
					const patched = matter.stringify(written.content, written.frontmatter);
					await writeSkillFile(skillPath, patched);
				}

				console.log(chalk.green(`  ✓ Updated ${skillPath}`));
				totalApplied++;
			} else {
				console.log(chalk.dim("  Skipped"));
				totalSkipped++;
			}
		}

		// Update registry if any skills were applied for this product
		if (!options.dryRun && (applyAll || totalApplied > 0)) {
			product.verifiedVersion = result.latestVersion;
			product.verifiedAt = new Date().toISOString();
		}
	}

	// Save registry
	if (!options.dryRun && totalApplied > 0) {
		registry.lastCheck = new Date().toISOString();
		const savedPath = await saveRegistry(registry, options.registry);
		console.log(chalk.dim(`\nRegistry updated: ${savedPath}`));
	}

	// Summary
	console.log(chalk.bold("\n--- Refresh Summary ---"));
	console.log(`  Applied: ${chalk.green(String(totalApplied))}`);
	console.log(`  Skipped: ${chalk.dim(String(totalSkipped))}`);
	console.log();

	return 0;
}

/**
 * Get chalk color for confidence level.
 */
function confidenceColor(confidence: "high" | "medium" | "low") {
	switch (confidence) {
		case "high":
			return chalk.green;
		case "medium":
			return chalk.yellow;
		case "low":
			return chalk.red;
		default:
			return chalk.dim;
	}
}

/**
 * Prompt user for input via readline.
 */
function promptUser(question: string): Promise<string> {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim().toLowerCase() || "n");
		});
	});
}
