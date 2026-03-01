import chalk from "chalk";
import { fetchLatestVersions } from "../npm.js";
import { loadRegistry } from "../registry.js";
import { getSeverity, normalizeVersion } from "../severity.js";
import type { CheckResult } from "../types.js";

interface CheckOptions {
	registry?: string;
	product?: string;
	json?: boolean;
	verbose?: boolean;
	ci?: boolean;
}

/**
 * Check all products in the registry against npm.
 */
export async function checkCommand(options: CheckOptions): Promise<number> {
	const registry = await loadRegistry(options.registry);

	// Filter to single product if requested
	const productEntries = Object.entries(registry.products).filter(
		([key]) => !options.product || key === options.product,
	);

	if (options.product && productEntries.length === 0) {
		console.error(chalk.red(`Product "${options.product}" not found in registry.`));
		return 2;
	}

	// Fetch all latest versions in parallel
	const packageNames = productEntries.map(([, p]) => p.package);
	const latestVersions = await fetchLatestVersions(packageNames);

	// Build results
	const results: CheckResult[] = [];

	for (const [key, product] of productEntries) {
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

		if (!verifiedNorm || !latestNorm) {
			console.error(
				chalk.yellow(
					`  Warning: Invalid semver for "${key}": verified=${product.verifiedVersion}, latest=${latest}`,
				),
			);
			continue;
		}

		if (verifiedNorm.coerced) {
			console.error(
				chalk.yellow(
					`  Warning: "${key}" verified version "${product.verifiedVersion}" was coerced to "${verifiedNorm.version}"`,
				),
			);
		}

		const severity = getSeverity(verifiedNorm.version, latestNorm.version);

		results.push({
			product: key,
			displayName: product.displayName,
			package: product.package,
			verifiedVersion: product.verifiedVersion,
			latestVersion: latest,
			skills: product.skills,
			changelog: product.changelog,
			stale: severity !== "current",
			severity,
		});
	}

	// JSON output
	if (options.json) {
		console.log(JSON.stringify(results, null, 2));
		const hasStale = results.some((r) => r.stale);
		return options.ci && hasStale ? 1 : 0;
	}

	// Human-readable output
	const stale = results.filter((r) => r.stale);
	const current = results.filter((r) => !r.stale);

	console.log();
	console.log(chalk.bold("skill-versions"));
	console.log("=".repeat(50));

	if (stale.length > 0) {
		console.log();
		console.log(chalk.red.bold(`STALE (${stale.length}):`));

		for (const result of stale) {
			const severityColor =
				result.severity === "major"
					? chalk.red
					: result.severity === "minor"
						? chalk.yellow
						: chalk.blue;

			console.log(
				`  ${chalk.bold(result.displayName.padEnd(24))} ${result.verifiedVersion} ${chalk.dim("→")} ${severityColor(result.latestVersion)} ${chalk.dim(`(${result.severity})`)}`,
			);
			console.log(`    ${chalk.dim("skills:")} ${result.skills.join(", ")}`);

			if (result.changelog) {
				console.log(`    ${chalk.dim("changelog:")} ${result.changelog}`);
			}
		}
	}

	if (options.verbose && current.length > 0) {
		console.log();
		console.log(chalk.green.bold(`CURRENT (${current.length}):`));
		console.log(`  ${current.map((r) => r.product).join(", ")}`);
	} else if (current.length > 0) {
		console.log();
		console.log(
			chalk.green(`CURRENT (${current.length}): `) +
				chalk.dim(current.map((r) => r.product).join(", ")),
		);
	}

	if (stale.length > 0) {
		console.log();
		console.log(
			chalk.dim('Run "skill-versions report --format markdown" for a full report.'),
		);
	}

	console.log();

	if (options.ci && stale.length > 0) return 1;
	return 0;
}
