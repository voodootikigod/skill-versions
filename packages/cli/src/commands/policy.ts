import { writeFile } from "node:fs/promises";
import chalk from "chalk";
import { runPolicyCheck } from "../policy/index.js";
import { generateStarterPolicy } from "../policy/init.js";
import { discoverPolicyFile, loadPolicyFile, validatePolicy } from "../policy/parser.js";
import { formatPolicyJson } from "../policy/reporters/json.js";
import { formatPolicyMarkdown } from "../policy/reporters/markdown.js";
import { formatPolicySarif } from "../policy/reporters/sarif.js";
import { formatPolicyTerminal } from "../policy/reporters/terminal.js";
import type { PolicyOptions, PolicySeverity, SkillPolicy } from "../policy/types.js";
import { formatAndOutput, policyThreshold } from "../shared/index.js";

interface PolicyCheckCommandOptions {
	ci?: boolean;
	failOn?: string;
	format?: "terminal" | "json" | "markdown" | "sarif";
	output?: string;
	policy?: string;
	pubkey?: string;
	quiet?: boolean;
	requireSignature?: boolean;
	skill?: string;
	verbose?: boolean;
}

/**
 * Verify a policy file's detached signature when required. Returns an exit code
 * to short-circuit with (fail-closed), or null when verification passes / is
 * not requested.
 */
async function verifyPolicySignatureGate(
	policyPath: string,
	options: PolicyCheckCommandOptions
): Promise<number | null> {
	if (!options.requireSignature) {
		return null;
	}
	if (!options.pubkey) {
		console.error(chalk.red("--require-signature requires --pubkey <path>"));
		return 2;
	}
	const { readFile } = await import("node:fs/promises");
	const { verifyPolicyFile } = await import("../policy/signature.js");
	const { collectPolicyFiles } = await import("../policy/parser.js");
	const publicKey = await readFile(options.pubkey, "utf-8");

	// Verify the entire inheritance closure — every base policy must be signed,
	// not just the leaf — so an unsigned/tampered base cannot be trusted.
	let chain: string[];
	try {
		chain = await collectPolicyFiles(policyPath);
	} catch (err) {
		console.error(
			chalk.red(
				`Cannot resolve policy inheritance for verification: ${err instanceof Error ? err.message : String(err)}`
			)
		);
		return 2;
	}

	for (const file of chain) {
		const result = await verifyPolicyFile(file, publicKey);
		if (!result.valid) {
			console.error(
				chalk.red(`Policy signature verification failed for ${file}: ${result.reason}`)
			);
			return 2;
		}
		if (options.verbose) {
			console.error(
				chalk.dim(`Policy signature valid: ${file} (signed by ${result.keyId ?? "unknown"})`)
			);
		}
	}
	return null;
}

/**
 * `skills-check policy check` — check skills against policy.
 */
export async function policyCheckCommand(
	dir: string,
	options: PolicyCheckCommandOptions
): Promise<number> {
	if (options.verbose && options.quiet) {
		console.error(chalk.red("Cannot use --verbose and --quiet together."));
		return 2;
	}

	const failOn = (options.failOn ?? "blocked") as PolicySeverity;
	if (!policyThreshold.validValues.has(failOn)) {
		console.error(
			chalk.red(
				`Invalid --fail-on value: "${options.failOn}". Use: ${[...policyThreshold.validValues].join(", ")}`
			)
		);
		return 2;
	}

	// Discover or load policy file
	let policyPath: string;
	if (options.policy) {
		policyPath = options.policy;
	} else {
		const discovered = await discoverPolicyFile(dir);
		if (!discovered) {
			console.error(
				chalk.red("No .skill-policy.yml found. Run `skills-check policy init` to create one.")
			);
			return 2;
		}
		policyPath = discovered;
	}

	// Fail-closed signature verification: when required, the policy must carry a
	// valid detached signature before any of its rules are trusted.
	const sigGate = await verifyPolicySignatureGate(policyPath, options);
	if (sigGate !== null) {
		return sigGate;
	}

	let policy: SkillPolicy;
	try {
		policy = await loadPolicyFile(policyPath);
	} catch (err) {
		console.error(
			chalk.red(`Failed to load policy: ${err instanceof Error ? err.message : String(err)}`)
		);
		return 2;
	}

	// Validate policy
	const validationErrors = validatePolicy(policy);
	if (validationErrors.length > 0) {
		console.error(chalk.red("Policy file has validation errors:"));
		for (const err of validationErrors) {
			console.error(chalk.red(`  - ${err}`));
		}
		return 2;
	}

	const policyOptions: PolicyOptions = {
		policy: policyPath,
		skill: options.skill,
		ci: options.ci,
		format: options.format,
		output: options.output,
		failOn,
	};

	const report = await runPolicyCheck([dir], policy, policyPath, policyOptions);

	// Format and write output
	await formatAndOutput(
		report,
		{ format: options.format, output: options.output, quiet: options.quiet },
		{
			terminal: formatPolicyTerminal,
			json: formatPolicyJson,
			markdown: formatPolicyMarkdown,
			sarif: formatPolicySarif,
		}
	);

	// Determine exit code based on threshold
	const hasFailingFindings = report.findings.some((f) =>
		policyThreshold.meetsThreshold(f.severity, failOn)
	);
	const hasMissingRequired = report.required.some((r) => !r.satisfied);

	if (options.ci && (hasFailingFindings || hasMissingRequired)) {
		return 1;
	}

	return hasFailingFindings ? 1 : 0;
}

/**
 * `skills-check policy init` — generate a starter policy file.
 */
export async function policyInitCommand(options: { output?: string }): Promise<number> {
	const content = generateStarterPolicy();
	const outputPath = options.output ?? ".skill-policy.yml";

	await writeFile(outputPath, content, "utf-8");
	console.log(chalk.green(`Created ${outputPath}`));
	return 0;
}

/**
 * `skills-check policy validate` — validate a policy file.
 */
export async function policyValidateCommand(options: { policy?: string }): Promise<number> {
	const policyPath = options.policy ?? ".skill-policy.yml";

	let policy: SkillPolicy;
	try {
		policy = await loadPolicyFile(policyPath);
	} catch (err) {
		console.error(
			chalk.red(`Failed to parse policy: ${err instanceof Error ? err.message : String(err)}`)
		);
		return 1;
	}

	const errors = validatePolicy(policy);
	if (errors.length > 0) {
		console.error(chalk.red("Validation errors:"));
		for (const err of errors) {
			console.error(chalk.red(`  - ${err}`));
		}
		return 1;
	}

	console.log(chalk.green(`${policyPath} is valid.`));
	return 0;
}

/**
 * `skills-check policy sign` — produce a detached signature for a policy file.
 */
export async function policySignCommand(options: {
	policy?: string;
	signKey?: string;
	keyId?: string;
	quiet?: boolean;
}): Promise<number> {
	const policyPath = options.policy ?? ".skill-policy.yml";
	if (!options.signKey) {
		console.error(chalk.red("policy sign requires --sign-key <path>"));
		return 2;
	}

	const { readFile } = await import("node:fs/promises");
	const { signPolicyFile } = await import("../policy/signature.js");

	try {
		const privateKey = await readFile(options.signKey, "utf-8");
		const sigPath = await signPolicyFile(policyPath, privateKey, options.keyId ?? "default");
		if (!options.quiet) {
			console.log(chalk.green(`Signed ${policyPath} → ${sigPath}`));
		}
		return 0;
	} catch (err) {
		console.error(
			chalk.red(`Failed to sign policy: ${err instanceof Error ? err.message : String(err)}`)
		);
		return 2;
	}
}
