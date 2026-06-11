import { createRequire } from "node:module";
import { Command } from "commander";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const program = new Command();

program
	.name("skills-check")
	.description(
		"The missing quality toolkit for Agent Skills — like npm outdated for skill knowledge"
	)
	.version(version);

program
	.command("check")
	.description("Check skill versions against npm registry")
	.option("-r, --registry <path>", "path to skills-check.json")
	.option("-p, --product <name>", "check a single product")
	.option("--json", "output results as JSON")
	.option("-v, --verbose", "show all products including current")
	.option("--quiet", "suppress output, exit code only")
	.option("--ci", "exit code 1 if any stale products found")
	.action(async (options) => {
		try {
			const { checkCommand } = await import("./commands/check.js");
			const code = await checkCommand(options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

program
	.command("init")
	.description("Scan skills directory and generate a skills-check.json registry")
	.argument("[dir]", "skills directory to scan", "./skills")
	.option("-y, --yes", "non-interactive mode, auto-detect package mappings")
	.option("-o, --output <path>", "output path for registry file")
	.action(async (dir, options) => {
		try {
			const { initCommand } = await import("./commands/init.js");
			const code = await initCommand(dir, options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

program
	.command("refresh")
	.description("Use an LLM to propose targeted updates to stale skill files")
	.argument("[skills-dir]", "path to skills directory")
	.option("-r, --registry <path>", "path to skills-check.json")
	.option("-p, --product <name>", "refresh a single product")
	.option("--provider <name>", "LLM provider: anthropic, openai, google")
	.option("--model <id>", "specific model ID (e.g. claude-sonnet-4-20250514)")
	.option("-y, --yes", "auto-apply without confirmation")
	.option("--dry-run", "show proposed changes, write nothing")
	.action(async (skillsDir, options) => {
		try {
			const { refreshCommand } = await import("./commands/refresh.js");
			const code = await refreshCommand(skillsDir, options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

program
	.command("audit")
	.description("Security audit & hallucination detection for skill files")
	.argument("[dir]", "directory to audit", ".")
	.option("-f, --format <type>", "output format: terminal, json, markdown, or sarif", "terminal")
	.option("-o, --output <path>", "write report to file")
	.option("--fail-on <severity>", "exit code 1 threshold: critical, high, medium, low", "high")
	.option("--packages-only", "only check package registries (fast)")
	.option("--skip-urls", "skip URL liveness checks")
	.option(
		"--unique-only",
		"skip injection and command checkers (use when Snyk/Socket/Gen cover these)"
	)
	.option("--include-registry-audits", "fetch Snyk/Socket/Gen results from skills.sh")
	.option("--ignore <path>", "path to .skills-checkignore file")
	.option("--strict", "disable all suppression (.skills-checkignore + inline audit-ignore)")
	.option("--verbose", "show progress and scan details")
	.option("--quiet", "suppress output, exit code only")
	.option(
		"--isolation <provider>",
		"run in isolated environment: auto, oci, apple, docker, podman, orbstack, rancher, nerdctl, vercel, local"
	)
	.option("--no-isolation", "force local execution (skip isolation detection)")
	.option("--force", "force refresh of the cache (bypass cache)")
	.option("--no-cache", "disable cache reads and writes")
	.action(async (dir, options) => {
		try {
			const { auditCommand } = await import("./commands/audit.js");
			const code = await auditCommand(dir, options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

program
	.command("budget")
	.description("Measure token cost and detect redundancy in skill files")
	.argument("[dir]", "directory to analyze", ".")
	.option("-s, --skill <name>", "analyze a specific skill by name")
	.option("-d, --detailed", "show per-section token breakdown")
	.option("-f, --format <type>", "output format: terminal, json, markdown, or sarif", "terminal")
	.option("-o, --output <path>", "write report to file")
	.option("--max-tokens <n>", "exit code 1 if total exceeds this threshold")
	.option("--save <path>", "save a snapshot for later comparison")
	.option("--compare <path>", "compare current budget against a saved snapshot")
	.option(
		"--model <name>",
		"model for cost estimation: claude-opus, claude-sonnet, claude-haiku, gpt-4o"
	)
	.option("--verbose", "show progress and details")
	.option("--quiet", "suppress output, exit code only")
	.action(async (dir, options) => {
		try {
			const { budgetCommand } = await import("./commands/budget.js");
			const code = await budgetCommand(dir, options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

program
	.command("fingerprint")
	.description("Generate a fingerprint registry of installed skills")
	.argument("[dir]", "directory to analyze", ".")
	.option("-o, --output <path>", "write registry to file")
	.option("--inject-watermarks", "add watermark comments to skills that lack them")
	.option("--sign-key <path>", "Ed25519 private key (PEM) to sign the registry")
	.option("--key-id <id>", "identifier recorded in the registry's signedBy field")
	.option("--verify <path>", "verify the signature of an existing registry JSON file")
	.option("--pubkey <path>", "Ed25519 public key (PEM) used with --verify")
	.option("--json", "output as JSON")
	.option("--ci", "strict exit codes")
	.option("--verbose", "show progress and details")
	.option("--quiet", "suppress output, exit code only")
	.action(async (dir, options) => {
		try {
			const { fingerprintCommand } = await import("./commands/fingerprint.js");
			const code = await fingerprintCommand(dir, options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

program
	.command("keygen")
	.description("Generate an Ed25519 key pair for signing registries and policies")
	.option("--out-dir <dir>", "directory to write keys into", ".")
	.option("--name <name>", "base filename for the key pair", "skills-check")
	.option("--quiet", "suppress output, exit code only")
	.action(async (options) => {
		try {
			const { keygenCommand } = await import("./commands/keygen.js");
			const code = await keygenCommand(options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

program
	.command("lint")
	.description("Validate metadata completeness and format in skill files")
	.argument("[dir]", "directory to lint", ".")
	.option("--fix", "auto-fix missing fields from git context")
	.option("--inject-watermarks", "inject fingerprint watermarks during --fix")
	.option("--ci", "strict CI mode")
	.option("--fail-on <level>", "exit code 1 threshold: error, warning", "error")
	.option("-f, --format <type>", "output format: terminal, json, markdown, or sarif", "terminal")
	.option("-o, --output <path>", "write report to file")
	.option("--verbose", "show progress and details")
	.option("--quiet", "suppress output, exit code only")
	.action(async (dir, options) => {
		try {
			const { lintCommand } = await import("./commands/lint.js");
			const code = await lintCommand(dir, options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

program
	.command("report")
	.description("Generate a full staleness report")
	.option("-r, --registry <path>", "path to skills-check.json")
	.option("-f, --format <type>", "output format: json or markdown", "markdown")
	.action(async (options) => {
		try {
			const { reportCommand } = await import("./commands/report.js");
			const code = await reportCommand(options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

program
	.command("verify")
	.description("Verify that skill version bumps match content changes")
	.option("-s, --skill <path>", "verify a single skill file or directory")
	.option("-a, --all", "verify all discovered skills")
	.option("--before <path>", "path to previous version of skill")
	.option("--after <path>", "path to current version of skill")
	.option("--suggest", "suggest appropriate version bump")
	.option("-f, --format <type>", "output format: terminal, json, markdown, or sarif", "terminal")
	.option("-o, --output <path>", "write report to file")
	.option("--provider <name>", "LLM provider: anthropic, openai, google")
	.option("--model <id>", "specific model ID")
	.option("--skip-llm", "disable LLM-assisted analysis")
	.option("--verbose", "show progress and details")
	.option("--quiet", "suppress output, exit code only")
	.action(async (options) => {
		try {
			const { verifyCommand } = await import("./commands/verify.js");
			const code = await verifyCommand(options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

const policyCmd = program
	.command("policy")
	.description("Enforce organizational policy rules for skill files");

policyCmd
	.command("check")
	.description("Check all installed skills against policy")
	.argument("[dir]", "directory to check", ".")
	.option("--policy <path>", "path to .skill-policy.yml")
	.option("-s, --skill <name>", "check a specific skill by name")
	.option("--ci", "strict exit codes")
	.option("-f, --format <type>", "output format: terminal, json, markdown, or sarif", "terminal")
	.option("-o, --output <path>", "write report to file")
	.option("--fail-on <severity>", "exit code 1 threshold: blocked, violation, warning", "blocked")
	.option("--require-signature", "require a valid detached policy signature before trusting rules")
	.option("--pubkey <path>", "Ed25519 public key (PEM) used with --require-signature")
	.option("--verbose", "show progress and details")
	.option("--quiet", "suppress output, exit code only")
	.action(async (dir, options) => {
		try {
			const { policyCheckCommand } = await import("./commands/policy.js");
			const code = await policyCheckCommand(dir, options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

policyCmd
	.command("init")
	.description("Generate a starter .skill-policy.yml file")
	.option("-o, --output <path>", "output path for policy file")
	.action(async (options) => {
		try {
			const { policyInitCommand } = await import("./commands/policy.js");
			const code = await policyInitCommand(options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

policyCmd
	.command("validate")
	.description("Validate a .skill-policy.yml file")
	.option("--policy <path>", "path to .skill-policy.yml")
	.action(async (options) => {
		try {
			const { policyValidateCommand } = await import("./commands/policy.js");
			const code = await policyValidateCommand(options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

policyCmd
	.command("sign")
	.description("Generate a detached signature for a .skill-policy.yml file")
	.option("--policy <path>", "path to .skill-policy.yml")
	.option("--sign-key <path>", "Ed25519 private key (PEM) to sign with")
	.option("--key-id <id>", "identifier recorded in the signature")
	.option("--quiet", "suppress output, exit code only")
	.action(async (options) => {
		try {
			const { policySignCommand } = await import("./commands/policy.js");
			const code = await policySignCommand(options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

program
	.command("test")
	.description("Run eval test suites declared in skill tests/ directories")
	.argument("[dir]", "directory to search for testable skills", ".")
	.option("-s, --skill <name>", "test a specific skill by name")
	.option("-t, --type <type>", "filter by test type: trigger, outcome, style, regression")
	.option("--agent <name>", "agent harness: claude-code, generic", "generic")
	.option("--agent-cmd <command>", "custom command template for generic harness")
	.option("-f, --format <type>", "output format: terminal, json, markdown, or sarif", "terminal")
	.option("-o, --output <path>", "write report to file")
	.option("--trials <n>", "runs per test case")
	.option("--pass-threshold <n>", "trials that must pass")
	.option("--timeout <seconds>", "per-case timeout")
	.option("--max-cost <dollars>", "budget cap for test run")
	.option("--dry", "show test plan without executing")
	.option("--update-baseline", "accept current results as new baseline")
	.option("--ci", "strict exit codes (exit 1 on regressions)")
	.option("--provider <name>", "LLM provider for rubric grading: anthropic, openai, google")
	.option("--model <id>", "model for rubric grading")
	.option("--verbose", "show per-grader results")
	.option("--quiet", "suppress output, exit code only")
	.option(
		"--isolation <provider>",
		"run in isolated environment: auto, oci, apple, docker, podman, orbstack, rancher, nerdctl, vercel, local"
	)
	.option("--no-isolation", "force local execution (skip isolation detection)")
	.option("--allow-unsafe-local", "allow CI to run without isolation (unsafe)")
	.option(
		"--allow-custom-graders",
		"permit custom graders to execute arbitrary code (disabled by default)"
	)
	.action(async (dir, options) => {
		try {
			const { testCommand } = await import("./commands/test.js");
			const code = await testCommand(dir, options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

program
	.command("usage")
	.description("Analyze skill usage from telemetry events")
	.option("--store <uri>", "telemetry store URI (file://, sqlite://)")
	.option("--since <date>", "start date (ISO 8601)")
	.option("--until <date>", "end date (ISO 8601)")
	.option("--check-policy", "cross-check against .skill-policy.yml")
	.option("--policy <path>", "path to policy file")
	.option("--detailed", "include per-model and per-user breakdown")
	.option("-f, --format <type>", "output format: terminal, json, or markdown", "terminal")
	.option("-o, --output <path>", "write report to file")
	.option("--json", "output as JSON")
	.option("--markdown", "output as markdown")
	.option("--ci", "strict exit codes")
	.option("--fail-on <severity>", "exit code 1 threshold")
	.option("--verbose", "show progress and details")
	.option("--quiet", "suppress output, exit code only")
	.action(async (options) => {
		try {
			const { usageCommand } = await import("./commands/usage.js");
			const code = await usageCommand(options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

program
	.command("fix [dir]")
	.description("apply deterministic autofixes to skill files")
	.option("--write", "apply fixes (default is dry-run)")
	.option("--format <format>", "output format: terminal, json", "terminal")
	.action(async (dir, options) => {
		try {
			const { fixCommand } = await import("./commands/fix.js");
			const code = await fixCommand(dir ?? ".", options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

program
	.command("doctor")
	.description("validate environment prerequisites and release readiness")
	.option("--format <format>", "output format: terminal, json", "terminal")
	.option("--ci", "exit with non-zero code on errors")
	.action(async (options) => {
		try {
			const { doctorCommand } = await import("./commands/doctor.js");
			const code = await doctorCommand(options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

program
	.command("health")
	.description("Run audit + lint + budget + policy as a single CI gate")
	.argument("[dir]", "directory to check", ".")
	.option("-f, --format <type>", "output format: terminal or json", "terminal")
	.option("-o, --output <path>", "write report to file")
	.option("--max-tokens <n>", "budget threshold for token count")
	.option("--skip-audit", "skip audit check")
	.option("--skip-lint", "skip lint check")
	.option("--skip-budget", "skip budget check")
	.option("--skip-policy", "skip policy check")
	.option("--verbose", "show progress and details")
	.option("--quiet", "suppress output, exit code only")
	.action(async (dir, options) => {
		try {
			const { healthCommand } = await import("./commands/health.js");
			const code = await healthCommand(dir, options);
			process.exit(code);
		} catch (error) {
			console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(2);
		}
	});

program.parse();
