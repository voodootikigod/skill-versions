export interface CommandInfo {
	ciTip?: string;
	commonFindings?: string[];
	description: string;
	examples: { label: string; code: string }[];
	group: string;
	icon: string;
	name: string;
	options: { flag: string; description: string }[];
	relatedCommands: { slug: string; relationship: string }[];
	slug: string;
	tagline: string;
	usage: string;
	whatItDoes: string[];
	whenToUse: string[];
	whyItMatters: string;
}

export const commands: CommandInfo[] = [
	{
		slug: "check",
		name: "check",
		icon: "\u2713",
		tagline: "Detect version drift by comparing skill frontmatter against the npm registry.",
		group: "Freshness & Currency",
		description:
			"Compare the product-version in your SKILL.md frontmatter against the latest version on npm. Instantly know which skills are stale and by how much.",
		whyItMatters:
			"Agent skills that reference outdated APIs lead to hallucinated code, broken builds, and wasted developer time. A skill written for React 18 won't generate correct React 19 Server Component patterns. Version drift is the #1 source of skill quality decay.",
		whatItDoes: [
			"Reads your skills-check.json registry to map products to npm packages",
			"Fetches the latest version from the npm registry for each product",
			"Compares it against the product-version declared in each skill's frontmatter",
			"Reports stale products with the exact version gap (e.g. 4.2.0 → 4.5.1)",
			"Exits with code 1 in CI mode when staleness is detected",
		],
		usage: "npx skills-check check [options]",
		options: [
			{
				flag: "--registry <path>",
				description: "Path to skills-check.json (default: skills-check.json)",
			},
			{ flag: "--json", description: "Output results as JSON" },
			{ flag: "--ci", description: "CI mode — exit code 1 if stale products found" },
			{ flag: "-p, --product <name>", description: "Check a single product" },
		],
		examples: [
			{ label: "Check all products", code: "npx skills-check check" },
			{ label: "JSON output for scripts", code: "npx skills-check check --json" },
			{ label: "CI gate", code: "npx skills-check check --ci" },
			{ label: "Check one product", code: "npx skills-check check -p ai-sdk" },
		],
		whenToUse: [
			"After a major framework release",
			"On a weekly CI schedule",
			"When a skill stops working as expected",
		],
		relatedCommands: [
			{ slug: "refresh", relationship: "Detect drift, then fix it" },
			{ slug: "report", relationship: "Generate formatted output of check results" },
			{ slug: "init", relationship: "Set up registry, then start checking" },
		],
		ciTip:
			"Pair with the GitHub Action to automatically open issues when skills go stale. Set fail-on-stale: true to block merges until skills are updated.",
	},
	{
		slug: "refresh",
		name: "refresh",
		icon: "\u21BB",
		tagline:
			"AI-assisted updates to stale skills using LLMs. Fetches changelogs and generates diffs.",
		group: "Freshness & Currency",
		description:
			"Automatically update stale skill files by fetching changelogs, analyzing breaking changes, and generating targeted diffs using LLMs. Review, approve, or auto-apply.",
		whyItMatters:
			"Manually updating skills after every dependency release is tedious and error-prone. Refresh automates the grunt work — it reads the changelog, understands what changed, and proposes precise edits to your skill files so agents always have current instructions.",
		whatItDoes: [
			"Identifies stale skills by running check internally",
			"Fetches changelogs and release notes from GitHub for each stale product",
			"Sends the current skill content + changelog to an LLM to generate a targeted update",
			"Presents a diff for review in interactive mode, or auto-applies with -y",
			"Preserves your skill's structure and style — only changes what's outdated",
		],
		usage: "npx skills-check refresh [skills-dir] [options]",
		options: [
			{ flag: "-y, --yes", description: "Auto-apply all changes without prompting" },
			{ flag: "--dry-run", description: "Preview changes without writing files" },
			{ flag: "--provider <name>", description: "LLM provider: anthropic, openai, or google" },
			{ flag: "--model <name>", description: "Specific model ID to use" },
			{ flag: "-p, --product <name>", description: "Refresh a single product" },
		],
		examples: [
			{ label: "Interactive review", code: "npx skills-check refresh ./skills" },
			{ label: "Auto-apply", code: "npx skills-check refresh -y" },
			{ label: "Preview only", code: "npx skills-check refresh --dry-run" },
			{
				label: "Specific provider",
				code: "npx skills-check refresh --provider anthropic --model claude-sonnet-4-20250514",
			},
		],
		whenToUse: [
			"After check detects version drift",
			"When a product ships breaking changes",
			"Before publishing an updated skill",
		],
		relatedCommands: [
			{ slug: "check", relationship: "Detect drift, then fix it" },
			{ slug: "test", relationship: "Refresh a skill, then verify behavior" },
		],
		ciTip:
			"Run refresh in --dry-run mode as a CI check to surface which skills need updates, then handle updates in a separate PR workflow.",
	},
	{
		slug: "report",
		name: "report",
		icon: "\u2691",
		tagline: "Generate a formatted staleness report in markdown or JSON for your team or CI.",
		group: "Freshness & Currency",
		description:
			"Produce a comprehensive staleness report summarizing which skills are current, which are stale, and by how much. Output as markdown for issues or JSON for automation.",
		whyItMatters:
			"Teams need visibility into skill health across their entire fleet. A weekly report in a GitHub issue or Slack message keeps everyone aware of drift without requiring manual checks.",
		whatItDoes: [
			"Runs a full version check against the npm registry",
			"Generates a formatted report with current vs. latest versions",
			"Groups results by status (stale, current, error)",
			"Outputs markdown suitable for GitHub issues or JSON for pipelines",
		],
		usage: "npx skills-check report [options]",
		options: [
			{ flag: "--registry <path>", description: "Path to skills-check.json" },
			{ flag: "--format <type>", description: "Output format: markdown or json" },
		],
		examples: [
			{ label: "Markdown report", code: "npx skills-check report" },
			{ label: "JSON for automation", code: "npx skills-check report --format json" },
		],
		whenToUse: [
			"To share freshness status with your team",
			"In CI for PR comments",
			"For periodic health dashboards",
		],
		relatedCommands: [
			{ slug: "check", relationship: "Generate formatted output of check results" },
		],
		ciTip:
			"The GitHub Action automatically generates a report and opens/updates a GitHub issue when staleness is detected. Use the report output for custom Slack or email notifications.",
	},
	{
		slug: "audit",
		name: "audit",
		icon: "\u26A1",
		tagline: "Scan for hallucinated packages, prompt injection, dangerous commands, and dead URLs.",
		group: "Security & Quality",
		description:
			"A security-focused scan that verifies every package, URL, and command in your skill files. Catches hallucinated dependencies, prompt injection patterns, dangerous shell commands, and broken links before they reach an agent.",
		whyItMatters:
			"Skills are executable instructions — an agent will npm install packages, run shell commands, and follow URLs exactly as written. A hallucinated package name could install malware via typosquatting. A prompt injection pattern could override agent safety boundaries. Audit catches these before they cause harm.",
		whatItDoes: [
			"Extracts all npm/pip/cargo package references and verifies they exist on their registries",
			"Cross-references against known hallucinated package databases (Aikido Security, Socket.dev research)",
			"Scans for prompt injection patterns: instruction overrides, data exfiltration, obfuscation",
			"Flags dangerous shell commands: destructive operations, pipe-to-shell installs, sensitive file access",
			"Checks every URL for liveness via HEAD requests with SSRF protection",
			"Validates frontmatter metadata completeness",
		],
		usage: "npx skills-check audit [path] [options]",
		options: [
			{ flag: "--format <type>", description: "Output: terminal, json, markdown, or sarif" },
			{
				flag: "--fail-on <severity>",
				description: "Exit 1 at threshold: critical, high, medium, low",
			},
			{ flag: "--ci", description: "CI mode with strict exit codes" },
			{ flag: "--quiet", description: "Suppress non-finding output" },
			{ flag: "--no-network", description: "Skip network-dependent checks (registry, URLs)" },
			{
				flag: "--isolation <provider>",
				description:
					"Run in an isolated container (auto, docker, podman, apple-container, vercel-sandbox, etc.)",
			},
			{ flag: "--no-isolation", description: "Disable isolation and run directly on the host" },
		],
		examples: [
			{ label: "Audit everything", code: "npx skills-check audit" },
			{ label: "Audit one file", code: "npx skills-check audit ./skills/ai-sdk-core.md" },
			{ label: "SARIF for GitHub Security tab", code: "npx skills-check audit --format sarif" },
			{ label: "CI gate at high severity", code: "npx skills-check audit --fail-on high --ci" },
			{
				label: "Audit in Docker",
				code: "npx skills-check audit --isolation docker",
			},
		],
		whenToUse: [
			"Before publishing a skill to the registry",
			"When reviewing a contributed SKILL.md",
			"In CI before merge",
		],
		relatedCommands: [
			{ slug: "policy", relationship: "Scan for issues, then enforce rules" },
			{ slug: "lint", relationship: "Audit content, then validate format" },
		],
		commonFindings: [
			"Hallucinated npm package — referenced package doesn't exist",
			"Prompt injection pattern — override instructions detected",
			"Dead URL — linked resource returns 404",
			"Missing metadata — required frontmatter fields absent",
		],
		ciTip:
			"Use --format sarif and upload to GitHub's code scanning to see findings inline on PRs. Combine with --fail-on high to block merges on critical issues.",
	},
	{
		slug: "lint",
		name: "lint",
		icon: "\u2726",
		tagline: "Validate metadata completeness, structural quality, and format in skill files.",
		group: "Security & Quality",
		description:
			"Enforce metadata standards across your skill fleet. Validates required frontmatter fields, checks SPDX license identifiers, verifies URLs, and can auto-fix missing fields from git context.",
		whyItMatters:
			"Incomplete metadata breaks downstream tooling. Without a name, skills-check can't track a skill. Without product-version, check can't detect drift. Without a license, legal compliance is impossible. Lint ensures every skill meets the bar before it ships.",
		whatItDoes: [
			"Validates required fields: name, description (always required)",
			"Checks publish-ready fields: author, license, repository",
			"Validates conditional fields: product-version when products are referenced, agents when agent-specific",
			"Verifies format: semver syntax, SPDX license identifiers (100+ supported with OR/AND expressions), valid URLs",
			"Auto-fix mode populates missing fields from git context (author from git config, repo from git remote)",
		],
		usage: "npx skills-check lint [dir] [options]",
		options: [
			{ flag: "--fix", description: "Auto-fix missing fields from git context" },
			{ flag: "--ci", description: "CI mode with strict exit codes" },
			{ flag: "--fail-on <level>", description: "Threshold: error or warning" },
			{ flag: "-f, --format <type>", description: "Output: terminal or json" },
		],
		examples: [
			{ label: "Lint all skills", code: "npx skills-check lint" },
			{ label: "Auto-fix from git", code: "npx skills-check lint --fix" },
			{ label: "CI gate", code: "npx skills-check lint --ci --fail-on error" },
			{ label: "JSON output", code: "npx skills-check lint --format json" },
		],
		whenToUse: [
			"Before committing a new skill",
			"After editing frontmatter metadata",
			"To auto-fix missing fields from git context",
		],
		relatedCommands: [
			{ slug: "verify", relationship: "Validate format, then validate semver" },
			{ slug: "audit", relationship: "Validate format, then audit content" },
		],
		commonFindings: [
			"Missing product-version — no version tracking possible",
			"Invalid SPDX license — unrecognized license identifier",
			"Missing author — skill has no attribution",
		],
		ciTip:
			"Run lint --fix locally before committing to auto-populate metadata. Use lint --ci in CI to catch skills that slip through without proper frontmatter.",
	},
	{
		slug: "policy",
		name: "policy",
		icon: "\u229E",
		tagline: "Enforce organizational trust rules for skills via .skill-policy.yml policy-as-code.",
		group: "Security & Quality",
		description:
			"Define and enforce organizational rules for which skills are allowed, what they must contain, and where they can come from. Policy-as-code via a .skill-policy.yml file that lives in your repo.",
		whyItMatters:
			"In team and enterprise environments, you need guardrails: only skills from approved sources, mandatory security disclaimers, banned patterns, freshness requirements. Policy turns these rules into automated checks that run in CI.",
		whatItDoes: [
			"Source allow/deny lists with glob matching (e.g., allow only npm:@your-org/*)",
			"Required skills verification — ensure critical skills are always present",
			"Banned skills — block known-bad or deprecated skills",
			"Metadata requirements — enforce specific frontmatter fields and allowed licenses",
			"Content deny/require patterns — flag or require specific content with line numbers",
			"Freshness limits — max version drift and max age in days",
			"Audit integration — require clean audit results as part of policy",
		],
		usage: "npx skills-check policy <subcommand> [options]",
		options: [
			{ flag: "--policy <path>", description: "Path to .skill-policy.yml" },
			{ flag: "--fail-on <severity>", description: "Threshold: blocked, violation, or warning" },
			{ flag: "--ci", description: "CI mode with strict exit codes" },
			{ flag: "-f, --format <type>", description: "Output: terminal or json" },
		],
		examples: [
			{ label: "Check against policy", code: "npx skills-check policy check" },
			{ label: "Initialize default policy", code: "npx skills-check policy init" },
			{ label: "Validate policy file", code: "npx skills-check policy validate" },
			{ label: "CI gate", code: "npx skills-check policy check --ci --fail-on violation" },
		],
		whenToUse: [
			"When onboarding teams to agent skills",
			"To enforce org-wide quality standards",
			"In CI to gate skill changes",
		],
		relatedCommands: [
			{ slug: "audit", relationship: "Scan for issues, then enforce rules" },
			{ slug: "lint", relationship: "Enforce policy, then validate format" },
		],
		commonFindings: [
			"Untrusted source — skill from non-allowed origin",
			"Banned pattern — prohibited content detected",
			"Stale skill — exceeds freshness limit",
		],
		ciTip:
			"Commit .skill-policy.yml to your repo root. Policy discovery walks up directories, so monorepo subdirectories inherit the root policy automatically.",
	},
	{
		slug: "budget",
		name: "budget",
		icon: "\u2261",
		tagline:
			"Measure token cost per skill, detect redundancy, and track context window usage over time.",
		group: "Analysis & Verification",
		description:
			"Every skill you load into an agent consumes context window tokens. Budget tells you exactly how many, finds redundancy between skills, estimates costs across model pricing tiers, and tracks changes over time.",
		whyItMatters:
			"Context windows are finite and expensive. Loading 5 verbose skills at 10K tokens each consumes half of Claude's context window before the user even types a prompt. Budget helps you optimize: trim bloated skills, deduplicate overlapping content, and set token ceilings that CI enforces.",
		whatItDoes: [
			"Counts tokens per skill using cl100k_base encoding (within 5% across model families)",
			"Breaks down token usage per section within each skill",
			"Detects inter-skill redundancy via 4-gram Jaccard similarity",
			"Estimates cost across model pricing tiers (Haiku, Sonnet, Opus)",
			"Saves snapshots and compares against baselines to track budget changes over time",
			"Enforces token ceilings — exit 1 if total exceeds a configurable threshold",
		],
		usage: "npx skills-check budget [dir] [options]",
		options: [
			{ flag: "-s, --skill <name>", description: "Analyze a specific skill" },
			{ flag: "-d, --detailed", description: "Per-section token breakdown" },
			{ flag: "--max-tokens <n>", description: "Token ceiling — exit 1 if exceeded" },
			{ flag: "--save <path>", description: "Save snapshot for future comparison" },
			{ flag: "--compare <path>", description: "Compare against a saved snapshot" },
			{ flag: "--model <name>", description: "Pricing model for cost estimates" },
			{ flag: "-f, --format <type>", description: "Output: terminal or json" },
		],
		examples: [
			{ label: "Analyze all skills", code: "npx skills-check budget" },
			{ label: "Detailed breakdown", code: "npx skills-check budget --detailed" },
			{ label: "Enforce a ceiling", code: "npx skills-check budget --max-tokens 50000" },
			{ label: "Save baseline", code: "npx skills-check budget --save baseline.json" },
			{ label: "Compare to baseline", code: "npx skills-check budget --compare baseline.json" },
		],
		whenToUse: [
			"When context window limits cause agent failures",
			"To compare token cost before and after edits",
			"To find redundancy across skills",
		],
		relatedCommands: [{ slug: "test", relationship: "Measure cost, then verify behavior" }],
		ciTip:
			"Set --max-tokens in CI to prevent skill bloat. Save a baseline in main and use --compare on PRs to catch token regressions before they merge.",
	},
	{
		slug: "verify",
		name: "verify",
		icon: "\u2690",
		tagline: "Validate that content changes between skill versions match the declared semver bump.",
		group: "Analysis & Verification",
		description:
			"Like cargo semver-checks but for knowledge. Verify that the version bump declared in a skill's frontmatter actually matches the magnitude of content changes. Catches both under-bumps (breaking changes in a patch) and over-bumps (typo fix as a major).",
		whyItMatters:
			"Semver is a contract. If an agent pins to ^1.0.0, a breaking change in 1.1.0 violates that contract. Verify catches dishonest or accidental version bumps by analyzing the actual content diff — using both heuristics and optional LLM-assisted semantic analysis.",
		whatItDoes: [
			"Retrieves the previous version of each skill from git history",
			"Computes section-level diffs, package changes, and content similarity scores",
			"Runs heuristic rules to classify changes as major, minor, or patch",
			"Optionally uses an LLM for semantic analysis of uncertain cases",
			"Compares the classified change level against the declared version bump",
			"Suggests the correct version bump when mismatches are found",
		],
		usage: "npx skills-check verify [options]",
		options: [
			{ flag: "-s, --skill <path>", description: "Verify a specific skill file" },
			{ flag: "-a, --all", description: "Verify all skills with git history" },
			{ flag: "--suggest", description: "Suggest the correct version bump" },
			{ flag: "--skip-llm", description: "Heuristic-only mode (no API key needed)" },
			{ flag: "--provider / --model", description: "LLM provider and model for semantic analysis" },
			{ flag: "-f, --format <type>", description: "Output: terminal or json" },
		],
		examples: [
			{ label: "Verify all skills", code: "npx skills-check verify --all" },
			{ label: "Suggest correct bump", code: "npx skills-check verify --suggest" },
			{ label: "Heuristic only", code: "npx skills-check verify --all --skip-llm" },
			{ label: "One skill", code: "npx skills-check verify -s ./skills/ai-sdk-core.md" },
		],
		whenToUse: [
			"After bumping a skill version",
			"In CI to validate changelogs",
			"Before publishing to the registry",
		],
		relatedCommands: [{ slug: "lint", relationship: "Validate format, then validate semver" }],
		commonFindings: [
			"Major change declared as patch — content changes too significant",
			"Missing version bump — content changed but version unchanged",
		],
		ciTip:
			"Run verify --all --skip-llm in CI for fast, deterministic checks. Use the full LLM-assisted mode locally for nuanced semantic analysis before publishing.",
	},
	{
		slug: "test",
		name: "test",
		icon: "\u25B7",
		tagline: "Run eval test suites declared in skill tests/ directories for regression detection.",
		group: "Analysis & Verification",
		description:
			"Execute eval test suites that verify skills actually work when loaded by an agent. Define test cases in cases.yaml with prompts, expected outcomes, and graders. Track baselines to catch regressions after refresh.",
		whyItMatters:
			"A skill can have perfect metadata and pass every lint check, but still produce wrong code when an agent uses it. Test closes this gap by actually running prompts through an agent harness and grading the output — like integration tests for your skill files.",
		whatItDoes: [
			"Discovers tests/ directories inside skill directories containing cases.yaml",
			"Parses declarative test suites with trigger, outcome, style, and regression test types",
			"Executes prompts through configurable agent harnesses (Claude Code CLI, generic shell)",
			"Grades results with 7 built-in graders: file-exists, command, contains, not-contains, json-match, package-has, llm-rubric",
			"Supports custom graders via dynamic module import",
			"Runs multiple trials per test case with configurable pass thresholds and flaky test detection",
			"Stores baselines for regression tracking across skill updates",
		],
		usage: "npx skills-check test [dir] [options]",
		options: [
			{ flag: "-s, --skill <name>", description: "Test a specific skill" },
			{ flag: "-t, --type <type>", description: "Filter: trigger, outcome, style, or regression" },
			{ flag: "--agent <name>", description: "Agent harness: claude-code or generic" },
			{ flag: "--trials <n>", description: "Number of runs per test case" },
			{ flag: "--dry", description: "Preview test plan without executing" },
			{ flag: "--update-baseline", description: "Save results as new baseline" },
			{ flag: "--ci", description: "CI mode with strict exit codes" },
			{ flag: "-f, --format <type>", description: "Output: terminal or json" },
			{
				flag: "--isolation <provider>",
				description:
					"Run in an isolated container (auto, docker, podman, apple-container, vercel-sandbox, etc.)",
			},
			{
				flag: "--no-isolation",
				description: "Disable isolation and accept the risk of running directly on the host",
			},
		],
		examples: [
			{ label: "Run all tests", code: "npx skills-check test" },
			{ label: "Test one skill", code: "npx skills-check test -s ai-sdk-core" },
			{ label: "Outcome tests only", code: "npx skills-check test --type outcome" },
			{ label: "Preview plan", code: "npx skills-check test --dry" },
			{ label: "Update baseline", code: "npx skills-check test --update-baseline" },
			{
				label: "Test in isolation",
				code: "npx skills-check test --isolation auto",
			},
		],
		whenToUse: [
			"After refreshing a stale skill",
			"To detect regressions in agent behavior",
			"Before major version releases",
		],
		relatedCommands: [
			{ slug: "budget", relationship: "Measure cost, then verify behavior" },
			{ slug: "refresh", relationship: "Refresh a skill, then verify behavior" },
		],
		ciTip:
			"Run test --ci after refresh to catch regressions. Use --update-baseline on main after verified changes so future PRs compare against the latest known-good results.",
	},
	{
		slug: "fingerprint",
		name: "fingerprint",
		icon: "\u{1F5DD}",
		tagline:
			"Generate a fingerprint registry of installed skills with content hashes and watermarks.",
		group: "Analysis & Verification",
		description:
			"Discover SKILL.md files, compute SHA-256 content hashes, extract or inject watermarks, and produce a FingerprintRegistry for integrity verification, runtime detection, and deduplication.",
		whyItMatters:
			"When agents load skills into context, you need to know exactly which skills are present and whether they've been tampered with. Fingerprint gives every skill a unique identity — a content hash that changes when the skill changes — enabling runtime detection, integrity verification, and deduplication across environments.",
		whatItDoes: [
			"Discovers all SKILL.md files in the target directory",
			"Computes SHA-256 hashes for frontmatter, content body, and a combined prefix",
			"Extracts existing watermarks or injects new ones into skill files",
			"Produces a FingerprintRegistry mapping each skill to its content hashes",
			"Outputs results in terminal, JSON, or machine-readable formats",
		],
		usage: "npx skills-check fingerprint [dir] [options]",
		options: [
			{ flag: "--output <path>", description: "Write fingerprint registry to a file" },
			{ flag: "--inject-watermarks", description: "Inject watermarks into skill files" },
			{ flag: "--json", description: "Output results as JSON" },
			{ flag: "--ci", description: "CI mode with strict exit codes" },
			{ flag: "--verbose", description: "Show detailed processing information" },
			{ flag: "--quiet", description: "Suppress non-essential output" },
		],
		examples: [
			{ label: "Fingerprint all skills", code: "npx skills-check fingerprint" },
			{ label: "Inject watermarks", code: "npx skills-check fingerprint --inject-watermarks" },
			{
				label: "JSON output to file",
				code: "npx skills-check fingerprint --json --output fingerprints.json",
			},
		],
		whenToUse: [
			"Before deploying skills to verify integrity",
			"In CI to track skill identity across builds",
			"For runtime telemetry integration and deduplication",
		],
		relatedCommands: [
			{ slug: "audit", relationship: "Fingerprint identity, then audit content" },
			{ slug: "budget", relationship: "Fingerprint skills, then measure their cost" },
			{ slug: "usage", relationship: "Fingerprint skills, then track their usage" },
		],
		ciTip:
			"Generate fingerprints in CI and compare against a known-good registry to detect unauthorized skill modifications. Use --inject-watermarks during build to enable runtime telemetry.",
	},
	{
		slug: "usage",
		name: "usage",
		icon: "\u2593",
		tagline:
			"Analyze skill telemetry events for usage patterns, cost estimation, and policy compliance.",
		group: "Analysis & Verification",
		description:
			"Read telemetry events from JSONL or SQLite stores to understand which skills are actually being used, how often, and at what cost. Cross-reference against organizational policies to detect unauthorized or non-compliant skill usage.",
		whyItMatters:
			"Installing and fingerprinting skills is only half the story — you also need to know which skills agents actually load at runtime, how much they cost, and whether usage complies with organizational policies. Usage closes the observability gap between skill installation and agent behavior.",
		whatItDoes: [
			"Reads telemetry events from JSONL or SQLite data stores",
			"Deduplicates events and groups them by skill identity",
			"Detects version drift between deployed and actually-used skill versions",
			"Estimates token cost based on skill usage frequency and context window consumption",
			"Cross-references usage against organizational policies for compliance checking",
		],
		usage: "npx skills-check usage [options]",
		options: [
			{ flag: "--store <path>", description: "Path to telemetry store (JSONL or SQLite)" },
			{ flag: "--since <date>", description: "Filter events after this date (ISO 8601)" },
			{ flag: "--until <date>", description: "Filter events before this date (ISO 8601)" },
			{ flag: "--check-policy", description: "Cross-reference usage against policy rules" },
			{ flag: "--policy <path>", description: "Path to .skill-policy.yml for compliance checks" },
			{ flag: "--format <type>", description: "Output: terminal, json, or markdown" },
			{ flag: "--json", description: "Shorthand for --format json" },
			{ flag: "--markdown", description: "Shorthand for --format markdown" },
			{ flag: "--output <path>", description: "Write report to a file" },
			{ flag: "--ci", description: "CI mode with strict exit codes" },
			{
				flag: "--fail-on <severity>",
				description: "Exit 1 at threshold: critical, high, medium, low",
			},
			{ flag: "--detailed", description: "Show per-event breakdown" },
			{ flag: "--verbose", description: "Show detailed processing information" },
			{ flag: "--quiet", description: "Suppress non-essential output" },
		],
		examples: [
			{ label: "Analyze usage", code: "npx skills-check usage --store ./telemetry.jsonl" },
			{
				label: "Usage with policy check",
				code: "npx skills-check usage --store ./telemetry.jsonl --check-policy",
			},
			{
				label: "Filter by date range",
				code: "npx skills-check usage --store ./telemetry.jsonl --since 2026-01-01 --until 2026-03-01",
			},
		],
		whenToUse: [
			"For usage reporting and cost tracking across teams",
			"In CI to enforce usage policies and detect anomalies",
			"To detect unauthorized or non-compliant skill usage",
		],
		relatedCommands: [
			{ slug: "fingerprint", relationship: "Fingerprint skills, then track their usage" },
			{ slug: "policy", relationship: "Analyze usage, then enforce policy rules" },
			{ slug: "budget", relationship: "Measure theoretical cost, then track actual usage" },
		],
		ciTip:
			"Run usage --check-policy in CI to catch unauthorized skill usage before it reaches production. Use --fail-on to set severity thresholds for policy violations.",
	},
	{
		slug: "init",
		name: "init",
		icon: "\u279C",
		tagline:
			"Scan a skills directory for SKILL.md files and generate a skills-check.json registry.",
		group: "Setup",
		description:
			"Bootstrap skills-check for your project. Scans a directory for SKILL.md files, prompts for npm package mappings, and generates the skills-check.json registry that all other commands depend on.",
		whyItMatters:
			"The skills-check.json registry is the foundation — it maps product names to npm packages and tracks which skill files belong to which product. Without it, check, report, and refresh can't function. Init sets everything up in seconds.",
		whatItDoes: [
			"Recursively scans a directory for files matching *SKILL.md or *skill.md",
			"Extracts product names and version references from frontmatter",
			"In interactive mode, prompts you to confirm or correct npm package mappings",
			"In non-interactive mode (-y), auto-detects mappings from frontmatter",
			"Generates a skills-check.json with $schema reference for editor validation",
		],
		usage: "npx skills-check init [dir] [options]",
		options: [
			{ flag: "-y, --yes", description: "Non-interactive mode (auto-detect mappings)" },
			{ flag: "-o, --output <path>", description: "Output path (default: skills-check.json)" },
		],
		examples: [
			{ label: "Interactive setup", code: "npx skills-check init ./skills" },
			{ label: "Auto-detect", code: "npx skills-check init ./skills -y" },
			{
				label: "Custom output path",
				code: "npx skills-check init ./skills -o config/registry.json",
			},
		],
		whenToUse: [
			"When starting a new project with agent skills",
			"To set up skills-check in an existing repo",
		],
		relatedCommands: [{ slug: "check", relationship: "Set up registry, then start checking" }],
		ciTip:
			"Run init once locally, then commit skills-check.json to your repo. Other commands will find it automatically.",
	},
];

export function getCommandBySlug(slug: string): CommandInfo | undefined {
	return commands.find((c) => c.slug === slug);
}

export const commandSlugs = commands.map((c) => c.slug);
