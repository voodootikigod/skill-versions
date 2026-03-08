import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import styles from "./docs.module.css";

export const metadata: Metadata = {
	title: "Docs",
	description:
		"CLI reference for skills-check: init, check, report, refresh, audit, lint, budget, verify, policy, test, fingerprint, and usage commands. Registry format, SKILL.md frontmatter spec, and CI integration guide.",
	alternates: {
		canonical: "https://skillscheck.ai/docs",
	},
};

const techArticleJsonLd = {
	"@context": "https://schema.org",
	"@type": "TechArticle",
	headline: "Skills Check Documentation",
	description:
		"Complete CLI reference for skills-check: init, check, report, refresh, audit, lint, budget, verify, policy, test, fingerprint, and usage commands. Registry format, SKILL.md frontmatter spec, and CI integration guide.",
	url: "https://skillscheck.ai/docs",
	author: { "@type": "Person", name: "Chris Williams" },
};

export default function DocsPage() {
	return (
		<>
			<script
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data requires innerHTML
				dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleJsonLd) }}
				type="application/ld+json"
			/>
			<Header />
			<main className={styles.main}>
				<article className={styles.article}>
					<h1>Documentation</h1>

					<section>
						<h2 id="overview">Overview</h2>
						<p>
							<code>skills-check</code> is a quality & integrity layer for Agent Skills. It provides
							12 commands covering freshness detection, security auditing, metadata linting, token
							budget analysis, semver verification, policy enforcement, eval testing, skill
							fingerprinting, and usage analytics for your SKILL.md files.
						</p>
					</section>

					<section>
						<h2 id="install">Installation</h2>
						<p>No installation required. Run directly with npx:</p>
						<pre>
							<code>npx skills-check check</code>
						</pre>
						<p>Or install globally:</p>
						<pre>
							<code>npm install -g skills-check</code>
						</pre>
					</section>

					<section>
						<h2 id="commands">Commands</h2>

						<p className={styles.commandNav}>
							<strong>Jump to:</strong> <a href="#cmd-init">init — set up your registry</a> &middot;{" "}
							<a href="#cmd-check">check — detect version drift</a> &middot;{" "}
							<a href="#cmd-report">report — generate staleness reports</a> &middot;{" "}
							<a href="#cmd-refresh">refresh — AI-assisted skill updates</a> &middot;{" "}
							<a href="#cmd-audit">audit — scan for security issues</a> &middot;{" "}
							<a href="#cmd-lint">lint — validate skill metadata</a> &middot;{" "}
							<a href="#cmd-budget">budget — measure token cost</a> &middot;{" "}
							<a href="#cmd-verify">verify — validate semver bumps</a> &middot;{" "}
							<a href="#cmd-policy">policy — enforce organizational rules</a> &middot;{" "}
							<a href="#cmd-test">test — run eval test suites</a> &middot;{" "}
							<a href="#cmd-fingerprint">fingerprint — generate skill identity hashes</a> &middot;{" "}
							<a href="#cmd-usage">usage — analyze skill telemetry</a>
						</p>

						<h3 id="cmd-init">
							<code>init [dir]</code>
						</h3>
						<p>
							Scan a skills directory for SKILL.md files and generate a{" "}
							<code>skills-check.json</code> registry.
						</p>
						<pre>
							<code>
								{`# Interactive mode (prompts for package mappings)
npx skills-check init ./skills

# Non-interactive mode (auto-detect mappings)
npx skills-check init ./skills -y`}
							</code>
						</pre>

						<h3 id="cmd-check">
							<code>check</code>
						</h3>
						<p>Check all products against the npm registry for version drift.</p>
						<pre>
							<code>
								{`# Human-readable output
npx skills-check check

# JSON output
npx skills-check check --json

# CI mode (exit code 1 if stale)
npx skills-check check --ci

# Check a single product
npx skills-check check -p ai-sdk`}
							</code>
						</pre>

						<h3 id="cmd-report">
							<code>report</code>
						</h3>
						<p>Generate a full staleness report.</p>
						<pre>
							<code>
								{`# Markdown report
npx skills-check report

# JSON report
npx skills-check report --format json`}
							</code>
						</pre>

						<h3 id="cmd-refresh">
							<code>refresh [skills-dir]</code>
						</h3>
						<p>
							Use an LLM to propose targeted updates to stale skill files. Fetches changelogs,
							generates diffs, and optionally applies changes.
						</p>
						<pre>
							<code>
								{`# Interactive mode — review each change
npx skills-check refresh ./skills

# Auto-apply all changes
npx skills-check refresh -y

# Preview only (no writes)
npx skills-check refresh --dry-run

# Use a specific provider/model
npx skills-check refresh --provider anthropic --model claude-sonnet-4-20250514

# Refresh a single product
npx skills-check refresh -p ai-sdk`}
							</code>
						</pre>
						<p>
							<strong>Provider setup:</strong> Install one of the provider SDKs and set the
							corresponding API key:
						</p>
						<pre>
							<code>
								{`# Anthropic (Claude)
npm install @ai-sdk/anthropic
export ANTHROPIC_API_KEY=sk-...

# OpenAI
npm install @ai-sdk/openai
export OPENAI_API_KEY=sk-...

# Google (Gemini)
npm install @ai-sdk/google
export GOOGLE_GENERATIVE_AI_API_KEY=...`}
							</code>
						</pre>

						<h3 id="cmd-audit">
							<code>audit [path]</code>
						</h3>
						<p>
							Security scan for skill files. Detects hallucinated packages, prompt injection
							patterns, dangerous commands, dead URLs, and metadata gaps.
						</p>
						<pre>
							<code>
								{`# Audit all skills in current directory
npx skills-check audit

# Audit a specific file or directory
npx skills-check audit ./skills/ai-sdk-core.md

# JSON output for CI
npx skills-check audit --format json

# SARIF output for GitHub Security tab
npx skills-check audit --format sarif

# Fail on specific severity
npx skills-check audit --fail-on warning --ci`}
							</code>
						</pre>

						<h3 id="cmd-lint">
							<code>lint [dir]</code>
						</h3>
						<p>
							Validate metadata completeness and format in skill files. Checks for required
							frontmatter fields, structural quality, and consistency.
						</p>
						<pre>
							<code>
								{`# Lint all skills in current directory
npx skills-check lint

# Auto-fix issues using git context
npx skills-check lint --fix

# CI mode with strict exit codes
npx skills-check lint --ci

# Fail on warnings (default: errors only)
npx skills-check lint --fail-on warning

# JSON output
npx skills-check lint --format json`}
							</code>
						</pre>
						<h4>Key options</h4>
						<table>
							<thead>
								<tr>
									<th>Option</th>
									<th>Description</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>
										<code>--fix</code>
									</td>
									<td>Auto-fix issues from git context</td>
								</tr>
								<tr>
									<td>
										<code>--ci</code>
									</td>
									<td>Strict CI mode with non-zero exit codes</td>
								</tr>
								<tr>
									<td>
										<code>--fail-on &lt;level&gt;</code>
									</td>
									<td>
										Threshold: <code>error</code> or <code>warning</code>
									</td>
								</tr>
								<tr>
									<td>
										<code>-f, --format &lt;type&gt;</code>
									</td>
									<td>
										<code>terminal</code> or <code>json</code>
									</td>
								</tr>
							</tbody>
						</table>

						<h3 id="cmd-budget">
							<code>budget [dir]</code>
						</h3>
						<p>
							Measure token cost and detect redundancy in skill files. Track context window usage
							over time and compare against baselines.
						</p>
						<pre>
							<code>
								{`# Analyze all skills
npx skills-check budget

# Analyze a specific skill
npx skills-check budget -s ai-sdk-core

# Detailed per-section breakdown
npx skills-check budget --detailed

# Set a token ceiling — exit 1 if exceeded
npx skills-check budget --max-tokens 5000

# Save a snapshot for future comparison
npx skills-check budget --save baseline.json

# Compare against a previous snapshot
npx skills-check budget --compare baseline.json

# JSON output
npx skills-check budget --format json`}
							</code>
						</pre>
						<h4>Key options</h4>
						<table>
							<thead>
								<tr>
									<th>Option</th>
									<th>Description</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>
										<code>-s, --skill &lt;name&gt;</code>
									</td>
									<td>Analyze a specific skill</td>
								</tr>
								<tr>
									<td>
										<code>-d, --detailed</code>
									</td>
									<td>Per-section token breakdown</td>
								</tr>
								<tr>
									<td>
										<code>--max-tokens &lt;n&gt;</code>
									</td>
									<td>Exit 1 if token count exceeds threshold</td>
								</tr>
								<tr>
									<td>
										<code>--save &lt;path&gt;</code>
									</td>
									<td>Save snapshot for comparison</td>
								</tr>
								<tr>
									<td>
										<code>--compare &lt;path&gt;</code>
									</td>
									<td>Compare against a saved snapshot</td>
								</tr>
								<tr>
									<td>
										<code>--model &lt;name&gt;</code>
									</td>
									<td>Pricing model for cost estimates</td>
								</tr>
							</tbody>
						</table>

						<h3 id="cmd-verify">
							<code>verify</code>
						</h3>
						<p>
							Verify that skill version bumps match content changes. Uses heuristics and optionally
							LLM-assisted semantic analysis to detect dishonest or accidental version changes.
						</p>
						<pre>
							<code>
								{`# Verify all skills
npx skills-check verify --all

# Verify a specific skill
npx skills-check verify -s ./skills/ai-sdk-core.md

# Compare specific versions
npx skills-check verify --before v1.0.0 --after v1.1.0

# Suggest the correct version bump
npx skills-check verify --suggest

# Heuristic-only mode (no LLM required)
npx skills-check verify --skip-llm`}
							</code>
						</pre>
						<h4>Key options</h4>
						<table>
							<thead>
								<tr>
									<th>Option</th>
									<th>Description</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>
										<code>-s, --skill &lt;path&gt;</code>
									</td>
									<td>Verify a specific skill file</td>
								</tr>
								<tr>
									<td>
										<code>-a, --all</code>
									</td>
									<td>Verify all skills</td>
								</tr>
								<tr>
									<td>
										<code>--suggest</code>
									</td>
									<td>Suggest the appropriate version bump</td>
								</tr>
								<tr>
									<td>
										<code>--skip-llm</code>
									</td>
									<td>Heuristic-only mode (no API key needed)</td>
								</tr>
								<tr>
									<td>
										<code>--provider / --model</code>
									</td>
									<td>LLM provider and model for semantic analysis</td>
								</tr>
							</tbody>
						</table>

						<h3 id="cmd-policy">
							<code>policy</code>
						</h3>
						<p>
							Enforce organizational policy rules for skill files. Define trusted sources, banned
							patterns, required metadata, and staleness limits via a <code>.skill-policy.yml</code>{" "}
							file.
						</p>
						<pre>
							<code>
								{`# Check skills against policy
npx skills-check policy check

# Check a specific skill
npx skills-check policy check -s ai-sdk-core

# Initialize a default policy file
npx skills-check policy init

# Validate the policy file itself
npx skills-check policy validate

# Custom policy file path
npx skills-check policy check --policy ./config/policy.yml

# Fail on specific severity
npx skills-check policy check --fail-on violation`}
							</code>
						</pre>
						<h4>Subcommands</h4>
						<table>
							<thead>
								<tr>
									<th>Subcommand</th>
									<th>Description</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>
										<code>policy check [dir]</code>
									</td>
									<td>Check skills against policy rules</td>
								</tr>
								<tr>
									<td>
										<code>policy init</code>
									</td>
									<td>
										Create a default <code>.skill-policy.yml</code>
									</td>
								</tr>
								<tr>
									<td>
										<code>policy validate</code>
									</td>
									<td>Validate the policy file syntax</td>
								</tr>
							</tbody>
						</table>

						<h3 id="cmd-test">
							<code>test [dir]</code>
						</h3>
						<p>
							Run eval test suites declared in skill <code>tests/</code> directories. Supports
							trigger, outcome, style, and regression test types with configurable agent harnesses.
						</p>
						<pre>
							<code>
								{`# Run all skill tests
npx skills-check test

# Test a specific skill
npx skills-check test -s ai-sdk-core

# Run only outcome tests
npx skills-check test --type outcome

# Use a specific agent harness
npx skills-check test --agent claude-code

# Multiple trials per test case
npx skills-check test --trials 3

# Preview test plan without executing
npx skills-check test --dry

# Update baseline after verified changes
npx skills-check test --update-baseline`}
							</code>
						</pre>
						<h4>Key options</h4>
						<table>
							<thead>
								<tr>
									<th>Option</th>
									<th>Description</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>
										<code>-s, --skill &lt;name&gt;</code>
									</td>
									<td>Test a specific skill</td>
								</tr>
								<tr>
									<td>
										<code>-t, --type &lt;type&gt;</code>
									</td>
									<td>
										<code>trigger</code>, <code>outcome</code>, <code>style</code>, or{" "}
										<code>regression</code>
									</td>
								</tr>
								<tr>
									<td>
										<code>--agent &lt;name&gt;</code>
									</td>
									<td>
										Agent harness: <code>claude-code</code> or <code>generic</code>
									</td>
								</tr>
								<tr>
									<td>
										<code>--trials &lt;n&gt;</code>
									</td>
									<td>Number of runs per test case</td>
								</tr>
								<tr>
									<td>
										<code>--dry</code>
									</td>
									<td>Preview test plan without executing</td>
								</tr>
								<tr>
									<td>
										<code>--update-baseline</code>
									</td>
									<td>Save results as new baseline</td>
								</tr>
							</tbody>
						</table>

						<h3 id="cmd-fingerprint">
							<code>fingerprint [dir]</code>
						</h3>
						<p>
							Generate a fingerprint registry of installed skills with SHA-256 content hashes and
							optional watermarks for runtime detection and integrity verification.
						</p>
						<pre>
							<code>
								{`# Fingerprint all skills
npx skills-check fingerprint

# Inject watermarks into skill files
npx skills-check fingerprint --inject-watermarks

# JSON output to file
npx skills-check fingerprint --json --output fingerprints.json`}
							</code>
						</pre>
						<h4>Key options</h4>
						<table>
							<thead>
								<tr>
									<th>Option</th>
									<th>Description</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>
										<code>--output &lt;path&gt;</code>
									</td>
									<td>Write fingerprint registry to a file</td>
								</tr>
								<tr>
									<td>
										<code>--inject-watermarks</code>
									</td>
									<td>Inject watermarks into skill files</td>
								</tr>
								<tr>
									<td>
										<code>--json</code>
									</td>
									<td>Output results as JSON</td>
								</tr>
								<tr>
									<td>
										<code>--ci</code>
									</td>
									<td>CI mode with strict exit codes</td>
								</tr>
								<tr>
									<td>
										<code>--verbose</code>
									</td>
									<td>Show detailed processing information</td>
								</tr>
							</tbody>
						</table>

						<h3 id="cmd-usage">
							<code>usage</code>
						</h3>
						<p>
							Analyze skill telemetry events from JSONL or SQLite stores for usage patterns, cost
							estimation, and policy compliance checking.
						</p>
						<pre>
							<code>
								{`# Analyze usage from a telemetry store
npx skills-check usage --store ./telemetry.jsonl

# Usage with policy compliance check
npx skills-check usage --store ./telemetry.jsonl --check-policy

# Filter by date range
npx skills-check usage --store ./telemetry.jsonl --since 2026-01-01 --until 2026-03-01

# JSON output
npx skills-check usage --store ./telemetry.jsonl --json

# CI mode with severity threshold
npx skills-check usage --store ./telemetry.jsonl --ci --fail-on high`}
							</code>
						</pre>
						<h4>Key options</h4>
						<table>
							<thead>
								<tr>
									<th>Option</th>
									<th>Description</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>
										<code>--store &lt;path&gt;</code>
									</td>
									<td>Path to telemetry store (JSONL or SQLite)</td>
								</tr>
								<tr>
									<td>
										<code>--since &lt;date&gt;</code>
									</td>
									<td>Filter events after this date (ISO 8601)</td>
								</tr>
								<tr>
									<td>
										<code>--until &lt;date&gt;</code>
									</td>
									<td>Filter events before this date (ISO 8601)</td>
								</tr>
								<tr>
									<td>
										<code>--check-policy</code>
									</td>
									<td>Cross-reference usage against policy rules</td>
								</tr>
								<tr>
									<td>
										<code>--policy &lt;path&gt;</code>
									</td>
									<td>
										Path to <code>.skill-policy.yml</code>
									</td>
								</tr>
								<tr>
									<td>
										<code>--fail-on &lt;severity&gt;</code>
									</td>
									<td>
										Exit 1 at threshold: <code>critical</code>, <code>high</code>,{" "}
										<code>medium</code>, <code>low</code>
									</td>
								</tr>
								<tr>
									<td>
										<code>--detailed</code>
									</td>
									<td>Show per-event breakdown</td>
								</tr>
							</tbody>
						</table>
					</section>

					<section>
						<h2 id="registry">Registry Format</h2>
						<p>
							The <code>skills-check.json</code> file follows a{" "}
							<Link href="/schema.json">skills-check registry JSON Schema</Link> that editors can
							validate against:
						</p>
						<pre>
							<code>
								{`{
  "$schema": "https://skillscheck.ai/schema.json",
  "version": 1,
  "products": {
    "ai-sdk": {
      "displayName": "Vercel AI SDK",
      "package": "ai",
      "verifiedVersion": "4.2.0",
      "verifiedAt": "2026-01-15T00:00:00Z",
      "skills": ["ai-sdk-core", "ai-sdk-tools"],
      "agents": ["ai-sdk-engineer"]
    }
  }
}`}
							</code>
						</pre>
					</section>

					<section>
						<h2 id="frontmatter">SKILL.md Frontmatter</h2>
						<p>
							Each SKILL.md file should include a <code>product-version</code> field in its YAML
							frontmatter:
						</p>
						<pre>
							<code>
								{`---
name: ai-sdk-core
product-version: "4.2.0"
---

# AI SDK Core

Your skill content here...`}
							</code>
						</pre>
					</section>

					<section>
						<h2 id="ci">CI Integration</h2>

						<h3>GitHub Action</h3>
						<p>
							The <code>voodootikigod/skills-check</code> action runs one or more skills-check
							commands in your CI pipeline. By default it runs <code>check</code> only
							(backward-compatible). Enable additional commands via the <code>commands</code> input
							or individual toggle flags.
						</p>
						<pre>
							<code>
								{`- uses: voodootikigod/skills-check@v1
  with:
    commands: check,audit,lint,budget
    audit-fail-on: high
    lint-fail-on: error
    budget-max-tokens: 50000`}
							</code>
						</pre>

						<h4>Command Selection</h4>
						<table>
							<thead>
								<tr>
									<th>Input</th>
									<th>Default</th>
									<th>Description</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>
										<code>commands</code>
									</td>
									<td>
										<code>&quot;&quot;</code>
									</td>
									<td>
										Comma-separated list (e.g. <code>check,audit,lint</code>). Overrides toggle
										flags.
									</td>
								</tr>
								<tr>
									<td>
										<code>check</code>
									</td>
									<td>
										<code>true</code>
									</td>
									<td>Run version drift detection</td>
								</tr>
								<tr>
									<td>
										<code>audit</code>
									</td>
									<td>
										<code>false</code>
									</td>
									<td>Run security &amp; hallucination detection</td>
								</tr>
								<tr>
									<td>
										<code>lint</code>
									</td>
									<td>
										<code>false</code>
									</td>
									<td>Run metadata validation</td>
								</tr>
								<tr>
									<td>
										<code>budget</code>
									</td>
									<td>
										<code>false</code>
									</td>
									<td>Run token cost analysis</td>
								</tr>
								<tr>
									<td>
										<code>policy</code>
									</td>
									<td>
										<code>false</code>
									</td>
									<td>Run policy enforcement</td>
								</tr>
								<tr>
									<td>
										<code>verify</code>
									</td>
									<td>
										<code>false</code>
									</td>
									<td>Run semver bump validation</td>
								</tr>
								<tr>
									<td>
										<code>test</code>
									</td>
									<td>
										<code>false</code>
									</td>
									<td>Run eval test suites</td>
								</tr>
							</tbody>
						</table>

						<h4>Thresholds</h4>
						<table>
							<thead>
								<tr>
									<th>Input</th>
									<th>Default</th>
									<th>Description</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>
										<code>audit-fail-on</code>
									</td>
									<td>
										<code>high</code>
									</td>
									<td>
										<code>critical</code>, <code>high</code>, <code>medium</code>, <code>low</code>
									</td>
								</tr>
								<tr>
									<td>
										<code>lint-fail-on</code>
									</td>
									<td>
										<code>error</code>
									</td>
									<td>
										<code>error</code> or <code>warning</code>
									</td>
								</tr>
								<tr>
									<td>
										<code>budget-max-tokens</code>
									</td>
									<td>
										<code>&quot;&quot;</code>
									</td>
									<td>Token ceiling (empty = no limit)</td>
								</tr>
								<tr>
									<td>
										<code>policy-file</code>
									</td>
									<td>
										<code>&quot;&quot;</code>
									</td>
									<td>
										Path to <code>.skill-policy.yml</code>
									</td>
								</tr>
								<tr>
									<td>
										<code>policy-fail-on</code>
									</td>
									<td>
										<code>blocked</code>
									</td>
									<td>
										<code>blocked</code>, <code>violation</code>, <code>warning</code>
									</td>
								</tr>
							</tbody>
						</table>

						<h4>Shared &amp; Check-specific Options</h4>
						<table>
							<thead>
								<tr>
									<th>Input</th>
									<th>Default</th>
									<th>Description</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>
										<code>skills-dir</code>
									</td>
									<td>
										<code>.</code>
									</td>
									<td>Directory containing skill files</td>
								</tr>
								<tr>
									<td>
										<code>registry</code>
									</td>
									<td>
										<code>skills-check.json</code>
									</td>
									<td>Path to registry file</td>
								</tr>
								<tr>
									<td>
										<code>node-version</code>
									</td>
									<td>
										<code>22</code>
									</td>
									<td>Node.js version</td>
								</tr>
								<tr>
									<td>
										<code>open-issues</code>
									</td>
									<td>
										<code>true</code>
									</td>
									<td>Open/update GitHub issue on staleness</td>
								</tr>
								<tr>
									<td>
										<code>issue-label</code>
									</td>
									<td>
										<code>skill-staleness</code>
									</td>
									<td>Label for issue deduplication</td>
								</tr>
								<tr>
									<td>
										<code>fail-on-stale</code>
									</td>
									<td>
										<code>false</code>
									</td>
									<td>Exit non-zero when stale</td>
								</tr>
								<tr>
									<td>
										<code>token</code>
									</td>
									<td>
										{/* biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions expression syntax */}
										<code>{"${{ github.token }}"}</code>
									</td>
									<td>
										GitHub token (needs <code>issues: write</code>)
									</td>
								</tr>
							</tbody>
						</table>

						<h4>Outputs</h4>
						<table>
							<thead>
								<tr>
									<th>Output</th>
									<th>Description</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>
										<code>stale-count</code>
									</td>
									<td>Number of stale products (0 if current)</td>
								</tr>
								<tr>
									<td>
										<code>issue-number</code>
									</td>
									<td>Issue number created/updated (empty if none)</td>
								</tr>
								<tr>
									<td>
										<code>report</code>
									</td>
									<td>Full markdown report from check</td>
								</tr>
								<tr>
									<td>
										<code>results</code>
									</td>
									<td>
										JSON with per-command exit codes (e.g.{" "}
										<code>{'\'{"check":0,"audit":1}\''}</code>)
									</td>
								</tr>
							</tbody>
						</table>

						<h4>Examples</h4>
						<pre>
							<code>
								{`# Full quality gate
- uses: voodootikigod/skills-check@v1
  with:
    commands: check,audit,lint,budget
    audit-fail-on: high
    lint-fail-on: error
    budget-max-tokens: 50000
    fail-on-stale: "true"

# Security-focused PR gate
- uses: voodootikigod/skills-check@v1
  with:
    commands: audit,lint
    audit-fail-on: medium
    open-issues: "false"

# Policy enforcement
- uses: voodootikigod/skills-check@v1
  with:
    commands: policy
    policy-file: .skill-policy.yml
    policy-fail-on: violation`}
							</code>
						</pre>

						<h4>Weekly cron example</h4>
						<pre>
							<code>
								{`name: Skill Quality Check
on:
  schedule:
    - cron: "0 9 * * 1"   # Monday 09:00 UTC
  workflow_dispatch:

permissions:
  contents: read
  issues: write

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: voodootikigod/skills-check@v1
        with:
          commands: check,audit,lint,budget
          audit-fail-on: high
          budget-max-tokens: 100000`}
							</code>
						</pre>

						<h3>Inline CLI</h3>
						<p>For simpler setups, run individual commands directly:</p>
						<pre>
							<code>
								{`- name: Check skill freshness
  run: npx skills-check check --ci

- name: Audit skill security
  run: npx skills-check audit --fail-on high --quiet

- name: Lint skill metadata
  run: npx skills-check lint --ci --fail-on error

- name: Check token budget
  run: npx skills-check budget --max-tokens 50000

- name: Enforce policy
  run: npx skills-check policy check --ci --fail-on violation`}
							</code>
						</pre>
					</section>

					<section>
						<h2 id="programmatic">Programmatic Reference</h2>
						<p>
							Need to integrate skills-check into scripts or CI pipelines? The{" "}
							<Link href="/reference">programmatic reference</Link> documents exit codes, JSON
							output schemas for every command, practical <code>jq</code> scripting examples, and
							SARIF integration for the GitHub Security tab.
						</p>
					</section>
				</article>
			</main>
			<Footer />
		</>
	);
}
