import { readFile } from "node:fs/promises";
import type { FingerprintRegistry } from "@skills-check/schema";
import chalk from "chalk";
import type { FingerprintOptions } from "../fingerprint/index.js";
import { runFingerprint, verifyFingerprintRegistry } from "../fingerprint/index.js";
import { formatAndOutput } from "../shared/index.js";

interface FingerprintCommandOptions {
	ci?: boolean;
	format?: "terminal" | "json";
	injectWatermarks?: boolean;
	json?: boolean;
	keyId?: string;
	output?: string;
	pubkey?: string;
	quiet?: boolean;
	signKey?: string;
	verbose?: boolean;
	verify?: string;
}

function formatFingerprintTerminal(registry: Record<string, unknown>): string {
	const reg = registry as {
		entries: Array<{
			skillId: string;
			version: string;
			watermark?: string;
			tokenCount: number;
			path: string;
		}>;
	};
	const lines: string[] = [];
	lines.push(chalk.bold("Fingerprint Registry"));
	lines.push("═".repeat(70));
	lines.push("");

	if (reg.entries.length === 0) {
		lines.push(chalk.dim("  No skills found."));
		return lines.join("\n");
	}

	lines.push(
		`  ${chalk.dim("Skill".padEnd(25))}${chalk.dim("Version".padEnd(12))}${chalk.dim("Watermark".padEnd(12))}${chalk.dim("Tokens")}`
	);
	lines.push(`  ${"─".repeat(25)}${"─".repeat(12)}${"─".repeat(12)}${"─".repeat(8)}`);

	for (const entry of reg.entries) {
		const wm = entry.watermark ? chalk.green("✓") : chalk.dim("—");
		lines.push(
			`  ${entry.skillId.padEnd(25)}${entry.version.padEnd(12)}${wm.padEnd(12)}${entry.tokenCount.toLocaleString()}`
		);
	}

	lines.push("");
	lines.push(`  ${chalk.bold("Total:")} ${reg.entries.length} skills`);
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

	// Verification mode: check the signature of an existing registry file.
	if (options.verify) {
		if (!options.pubkey) {
			console.error(chalk.red("--verify requires --pubkey <path>"));
			return 2;
		}
		let registry: FingerprintRegistry;
		try {
			registry = JSON.parse(await readFile(options.verify, "utf-8")) as FingerprintRegistry;
		} catch (error) {
			console.error(
				chalk.red(
					`Cannot read registry "${options.verify}": ${error instanceof Error ? error.message : String(error)}`
				)
			);
			return 2;
		}
		const publicKey = await readFile(options.pubkey, "utf-8");
		const ok = verifyFingerprintRegistry(registry, publicKey);
		if (!options.quiet) {
			console.log(
				ok
					? chalk.green(`✓ Signature valid (signed by ${registry.signedBy ?? "unknown"})`)
					: chalk.red("✗ Signature invalid or registry unsigned")
			);
		}
		return ok ? 0 : 1;
	}

	const fpOptions: FingerprintOptions = {
		ci: options.ci,
		injectWatermarks: options.injectWatermarks,
		json: options.json,
		output: options.output,
		signKeyPath: options.signKey,
		keyId: options.keyId,
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
