import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import { generateKeyPair } from "../signing/index.js";

interface KeygenCommandOptions {
	name?: string;
	outDir?: string;
	quiet?: boolean;
}

/**
 * Generate an Ed25519 key pair for signing fingerprint registries and policy
 * files. Writes a PKCS#8 private key (0600) and an SPKI public key.
 */
export async function keygenCommand(options: KeygenCommandOptions): Promise<number> {
	const name = options.name ?? "skills-check";
	const outDir = options.outDir ?? ".";
	const privatePath = join(outDir, `${name}.key`);
	const publicPath = join(outDir, `${name}.pub`);

	const { publicKey, privateKey } = generateKeyPair();

	try {
		await writeFile(privatePath, privateKey, { encoding: "utf-8", mode: 0o600 });
		await writeFile(publicPath, publicKey, { encoding: "utf-8", mode: 0o644 });
	} catch (error) {
		console.error(
			chalk.red(`Failed to write keys: ${error instanceof Error ? error.message : String(error)}`)
		);
		return 2;
	}

	if (!options.quiet) {
		console.log(chalk.green("Ed25519 key pair generated:"));
		console.log(
			`  ${chalk.bold("private")}  ${privatePath} ${chalk.dim("(keep secret, mode 0600)")}`
		);
		console.log(`  ${chalk.bold("public")}   ${publicPath}`);
		console.log("");
		console.log(chalk.dim("Sign a fingerprint registry:"));
		console.log(
			chalk.dim(
				`  skills-check fingerprint --sign-key ${privatePath} --key-id ${name} --json -o registry.json`
			)
		);
		console.log(chalk.dim("Verify it:"));
		console.log(
			chalk.dim(`  skills-check fingerprint --verify registry.json --pubkey ${publicPath}`)
		);
	}

	return 0;
}
