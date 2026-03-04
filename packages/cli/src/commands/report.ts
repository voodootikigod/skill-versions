import chalk from "chalk";
import { fetchLatestVersions } from "../npm.js";
import { loadRegistry } from "../registry.js";
import { getSeverity, normalizeVersion } from "../severity.js";
import type { CheckResult } from "../types.js";

interface ReportOptions {
	format?: "json" | "markdown";
	registry?: string;
}

/**
 * Generate a full staleness report.
 */
export async function reportCommand(options: ReportOptions): Promise<number> {
	const registry = await loadRegistry(options.registry);
	const productEntries = Object.entries(registry.products);

	// Fetch all latest versions in parallel
	const packageNames = productEntries.map(([, p]) => p.package);
	const latestVersions = await fetchLatestVersions(packageNames);

	// Build results
	const results: CheckResult[] = [];

	for (const [key, product] of productEntries) {
		const latest = latestVersions.get(product.package);

		if (latest instanceof Error || !latest) {
			continue;
		}

		const verifiedNorm = normalizeVersion(product.verifiedVersion);
		const latestNorm = normalizeVersion(latest);

		if (!(verifiedNorm && latestNorm)) {
			continue;
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

	const format = options.format ?? "markdown";

	if (format === "json") {
		console.log(JSON.stringify(results, null, 2));
		return 0;
	}

	// Markdown output
	const stale = results.filter((r) => r.stale);
	const current = results.filter((r) => !r.stale);
	const now = new Date().toISOString().split("T")[0];

	const lines: string[] = [];
	lines.push("# Skillsafe Report");
	lines.push("");
	lines.push(`Generated: ${now}`);
	lines.push("");
	lines.push("## Summary");
	lines.push("");
	lines.push(`- **Total products**: ${results.length}`);
	lines.push(`- **Stale**: ${stale.length}`);
	lines.push(`- **Current**: ${current.length}`);
	lines.push("");

	if (stale.length > 0) {
		lines.push("## Stale Products");
		lines.push("");
		lines.push("| Product | Verified | Latest | Severity | Affected Skills |");
		lines.push("|---------|----------|--------|----------|-----------------|");

		for (const result of stale) {
			const changelogLink = result.changelog
				? `[${result.displayName}](${result.changelog})`
				: result.displayName;
			lines.push(
				`| ${changelogLink} | ${result.verifiedVersion} | ${result.latestVersion} | ${result.severity} | ${result.skills.join(", ")} |`
			);
		}

		lines.push("");
	}

	if (current.length > 0) {
		lines.push("## Current Products");
		lines.push("");
		lines.push("| Product | Version | Skills |");
		lines.push("|---------|---------|--------|");

		for (const result of current) {
			lines.push(
				`| ${result.displayName} | ${result.verifiedVersion} | ${result.skills.join(", ")} |`
			);
		}

		lines.push("");
	}

	const markdown = lines.join("\n");
	console.log(markdown);

	// Also print to stderr if stdout is piped
	if (!process.stdout.isTTY) {
		console.error(
			chalk.green(`Report generated: ${results.length} products, ${stale.length} stale.`)
		);
	}

	return 0;
}
