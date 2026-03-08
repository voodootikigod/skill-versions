import chalk from "chalk";
import type { FingerprintOptions } from "../fingerprint/index.js";
import { runFingerprint } from "../fingerprint/index.js";
import { formatAndOutput } from "../shared/index.js";

interface FingerprintCommandOptions {
	ci?: boolean;
	format?: "terminal" | "json";
	injectWatermarks?: boolean;
	json?: boolean;
	output?: string;
	quiet?: boolean;
	verbose?: boolean;
}

function formatFingerprintTerminal(registry: Record<string, unknown>): string {
	const reg = registry as {
		skills: Array<{
			name: string;
			version: string;
			fingerprints: { watermark?: string };
			token_count: number;
			path: string;
		}>;
	};
	const lines: string[] = [];
	lines.push(chalk.bold("Fingerprint Registry"));
	lines.push("═".repeat(70));
	lines.push("");

	if (reg.skills.length === 0) {
		lines.push(chalk.dim("  No skills found."));
		return lines.join("\n");
	}

	lines.push(
		`  ${chalk.dim("Skill".padEnd(25))}${chalk.dim("Version".padEnd(12))}${chalk.dim("Watermark".padEnd(12))}${chalk.dim("Tokens")}`
	);
	lines.push(`  ${"─".repeat(25)}${"─".repeat(12)}${"─".repeat(12)}${"─".repeat(8)}`);

	for (const skill of reg.skills) {
		const wm = skill.fingerprints.watermark ? chalk.green("✓") : chalk.dim("—");
		lines.push(
			`  ${skill.name.padEnd(25)}${skill.version.padEnd(12)}${wm.padEnd(12)}${skill.token_count.toLocaleString()}`
		);
	}

	lines.push("");
	lines.push(`  ${chalk.bold("Total:")} ${reg.skills.length} skills`);
	return lines.join("\n");
}

function formatFingerprintJson(registry: Record<string, unknown>): string {
	return JSON.stringify(registry, null, 2);
}

export async function fingerprintCommand(
	dir: string,
	options: FingerprintCommandOptions
): Promise<number> {
	if (options.verbose && options.quiet) {
		console.error(chalk.red("Cannot use --verbose and --quiet together."));
		return 2;
	}

	const fpOptions: FingerprintOptions = {
		ci: options.ci,
		injectWatermarks: options.injectWatermarks,
		json: options.json,
		output: options.output,
	};

	const registry = await runFingerprint([dir], fpOptions);

	const format = options.json ? "json" : (options.format ?? "terminal");
	await formatAndOutput(
		registry as unknown as Record<string, unknown>,
		{ format, output: options.output, quiet: options.quiet },
		{
			terminal: formatFingerprintTerminal,
			json: formatFingerprintJson,
		}
	);

	return 0;
}
