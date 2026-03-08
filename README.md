# skills-check

Quality & integrity layer for [Agent Skills](https://agentskills.io) — like `npm outdated` for skill knowledge.

Skills that reference versioned products (via `product-version` in frontmatter) can drift as upstream packages ship new releases. `skills-check` detects this drift, audits security, lints metadata, analyzes token budgets, enforces policy, and more.

## Install

```bash
npm install -g skills-check
```

Or run directly:

```bash
npx skills-check check
```

## Quick Start

### 1. Initialize a registry

Scan your skills directory and map products to npm packages:

```bash
# Interactive — prompts for each mapping
skills-check init ./skills

# Non-interactive — auto-detects common packages
skills-check init ./skills --yes
```

This creates a `skills-check.json` registry file.

### 2. Check for staleness

```bash
skills-check check
```

Output:

```
skills-check
==================================================

STALE (2):
  Vercel AI SDK            6.0.105 → 6.1.0 (minor)
    skills: ai-sdk-core, ai-sdk-tools, ai-sdk-react, ai-sdk-multimodal

  Payload CMS              3.78.0 → 3.80.0 (minor)
    skills: payload-core, payload-data, payload-admin

CURRENT (15): upstash-redis, next, turbo, ...

Run "skills-check report --format markdown" for a full report.
```

### 3. Generate a report

```bash
# Markdown (for PRs, issues, dashboards)
skills-check report --format markdown > STALENESS.md

# JSON (for automation)
skills-check report --format json
```

## CLI Reference

### `skills-check init [dir]`

Scan a skills directory and generate a `skills-check.json` registry.

| Flag | Description |
|------|-------------|
| `-y, --yes` | Non-interactive mode, auto-detect package mappings |
| `-o, --output <path>` | Output path for registry file |

### `skills-check check`

Check skill versions against the npm registry.

| Flag | Description |
|------|-------------|
| `-r, --registry <path>` | Path to registry file (default: `./skills-check.json`) |
| `-p, --product <name>` | Check a single product |
| `--json` | Machine-readable JSON output |
| `-v, --verbose` | Show all products including current |
| `--ci` | Exit code 1 if any stale products found |

### `skills-check report`

Generate a full staleness report.

| Flag | Description |
|------|-------------|
| `-r, --registry <path>` | Path to registry file |
| `-f, --format <type>` | Output format: `json` or `markdown` (default: `markdown`) |

### `skills-check audit [dir]`

Security audit and hallucination detection for skill files. Scans for hallucinated package references, prompt injection patterns, dangerous shell commands, broken URLs, and incomplete metadata. Includes an advisory database of known hallucinated packages, persistent disk caching, and `.skills-checkignore` support.

| Flag | Description |
|------|-------------|
| `-f, --format <type>` | Output format: `terminal`, `json`, `markdown`, or `sarif` (default: `terminal`) |
| `-o, --output <path>` | Write report to file |
| `--fail-on <severity>` | Exit code 1 threshold: `critical`, `high`, `medium`, `low` (default: `high`) |
| `--packages-only` | Only check package registries (fast) |
| `--skip-urls` | Skip URL liveness checks |
| `--unique-only` | Skip injection and command checkers (use when Snyk/Socket/Gen cover these) |
| `--include-registry-audits` | Fetch Snyk/Socket/Gen results from skills.sh |
| `--ignore <path>` | Path to `.skills-checkignore` file |
| `--verbose` | Show progress and scan details |
| `--quiet` | Suppress output, exit code only |

**Checkers:**

| Tier | Category | Severity | What it checks |
|------|----------|----------|----------------|
| 1 | Hallucinated packages | Critical | Verifies npm/PyPI/crates.io packages actually exist |
| 1b | Advisory database | Critical | Flags known hallucinated packages (Aikido Security, Socket.dev research) |
| 2 | Prompt injection | Critical--Medium | Override instructions, data exfiltration, obfuscation (base64, zero-width Unicode) |
| 3 | Dangerous commands | Critical--Medium | `rm -rf`, `curl \| bash`, sensitive file access (`.ssh`, `.aws`, `.env`) |
| 4 | URL liveness | Medium | Verifies linked URLs respond (HEAD requests, 10s timeout) |
| 5 | Metadata completeness | Medium--Low | Required/recommended frontmatter fields |

**Output formats:**

- `terminal` -- chalk-colored, grouped by file with severity icons
- `json` -- machine-readable, full report structure
- `markdown` -- summary table + severity sections, suitable for PRs
- `sarif` -- SARIF 2.1.0 for GitHub Security tab integration

**Ignore rules:**

Create a `.skills-checkignore` file (one rule per line):

```
# Ignore all hallucinated-package findings
hallucinated-package

# Ignore prompt-injection in a specific file
prompt-injection:skills/example/SKILL.md
```

Or use inline HTML comments in skill files:

```markdown
<!-- audit-ignore -->
This line's findings will be suppressed.

<!-- audit-ignore:dangerous-command -->
This line's dangerous-command findings only will be suppressed.
```

**Caching:**

Registry lookups are cached to `~/.cache/skills-check/audit/` with a 1-hour TTL, so repeated runs are fast.

```bash
# Audit all skills in current directory
skills-check audit

# JSON output for CI
skills-check audit ./skills --format json

# SARIF for GitHub Security tab
skills-check audit ./skills --format sarif -o results.sarif

# Write markdown report to file
skills-check audit ./skills --format markdown -o audit-report.md

# Only check package registries (fastest)
skills-check audit ./skills --packages-only

# Skip slow URL checks
skills-check audit ./skills --skip-urls

# Fail only on critical findings
skills-check audit --fail-on critical

# Quiet mode for CI (exit code only)
skills-check audit --quiet --fail-on high
```

### `skills-check budget [dir]`

Measure token cost and detect redundancy in skill files. Analyzes how much context window each skill consumes and identifies overlap between skills.

| Flag | Description |
|------|-------------|
| `-s, --skill <name>` | Analyze a specific skill by name |
| `-d, --detailed` | Show per-section token breakdown |
| `-f, --format <type>` | Output format: `terminal`, `json`, or `markdown` (default: `terminal`) |
| `-o, --output <path>` | Write report to file |
| `--max-tokens <n>` | Exit code 1 if total exceeds this threshold |
| `--save <path>` | Save a snapshot for later comparison |
| `--compare <path>` | Compare current budget against a saved snapshot |
| `--model <name>` | Model for cost estimation: `claude-opus`, `claude-sonnet`, `claude-haiku`, `gpt-4o` |

```bash
# Analyze all skills in current directory
skills-check budget

# Detailed per-section breakdown
skills-check budget ./skills --detailed

# Fail if total tokens exceed 50k
skills-check budget --max-tokens 50000

# Save a baseline snapshot
skills-check budget --save baseline.json

# Compare against a saved baseline
skills-check budget --compare baseline.json

# JSON output for CI
skills-check budget --format json
```

### `skills-check verify`

Verify that skill version bumps match content changes. Validates that the declared semver bump (major/minor/patch) is appropriate for the actual content diff.

| Flag | Description |
|------|-------------|
| `-s, --skill <path>` | Verify a single skill file or directory |
| `-a, --all` | Verify all discovered skills |
| `--before <path>` | Path to previous version of skill |
| `--after <path>` | Path to current version of skill |
| `--suggest` | Suggest appropriate version bump |
| `-f, --format <type>` | Output format: `terminal` or `json` (default: `terminal`) |
| `-o, --output <path>` | Write report to file |
| `--provider <name>` | LLM provider: `anthropic`, `openai`, `google` |
| `--model <id>` | Specific model ID |
| `--skip-llm` | Disable LLM-assisted analysis |
| `--verbose` | Show progress and details |
| `--quiet` | Suppress output, exit code only |

```bash
# Verify all skills
skills-check verify --all

# Verify a single skill
skills-check verify --skill ./skills/react/SKILL.md

# Compare two specific versions
skills-check verify --before v1/SKILL.md --after v2/SKILL.md

# Suggest the appropriate bump level
skills-check verify --all --suggest

# Skip LLM (heuristic-only mode)
skills-check verify --all --skip-llm
```

### `skills-check lint [dir]`

Validate metadata completeness, structural quality, and format in skill files. Auto-fix mode can fill in missing fields from git context.

| Flag | Description |
|------|-------------|
| `--fix` | Auto-fix missing fields from git context |
| `--ci` | Strict CI mode |
| `--fail-on <level>` | Exit code 1 threshold: `error`, `warning` (default: `error`) |
| `-f, --format <type>` | Output format: `terminal` or `json` (default: `terminal`) |
| `-o, --output <path>` | Write report to file |

```bash
# Lint all skills in current directory
skills-check lint

# Auto-fix missing metadata
skills-check lint --fix

# CI mode with warning threshold
skills-check lint --ci --fail-on warning

# JSON output
skills-check lint --format json
```

### `skills-check policy <subcommand>`

Enforce organizational policy rules for skill files via `.skill-policy.yml`. The policy command has three subcommands.

#### `skills-check policy check [dir]`

Check all installed skills against organizational policy.

| Flag | Description |
|------|-------------|
| `--policy <path>` | Path to `.skill-policy.yml` |
| `-s, --skill <name>` | Check a specific skill by name |
| `--ci` | Strict exit codes |
| `-f, --format <type>` | Output format: `terminal` or `json` (default: `terminal`) |
| `-o, --output <path>` | Write report to file |
| `--fail-on <severity>` | Exit code 1 threshold: `blocked`, `violation`, `warning` (default: `blocked`) |

#### `skills-check policy init`

Generate a starter `.skill-policy.yml` file.

| Flag | Description |
|------|-------------|
| `-o, --output <path>` | Output path for policy file |

#### `skills-check policy validate`

Validate a `.skill-policy.yml` file for correctness.

| Flag | Description |
|------|-------------|
| `--policy <path>` | Path to `.skill-policy.yml` |

```bash
# Check skills against policy
skills-check policy check

# Use a custom policy file
skills-check policy check --policy ./my-policy.yml

# Generate a starter policy
skills-check policy init

# Validate an existing policy file
skills-check policy validate --policy .skill-policy.yml

# CI mode
skills-check policy check --ci --fail-on violation
```

### `skills-check test [dir]`

Run eval test suites declared in skill `tests/` directories. Supports multiple agent harnesses, rubric-based grading, regression detection, and budget caps.

| Flag | Description |
|------|-------------|
| `-s, --skill <name>` | Test a specific skill by name |
| `-t, --type <type>` | Filter by test type: `trigger`, `outcome`, `style`, `regression` |
| `--agent <name>` | Agent harness: `claude-code`, `generic` (default: `generic`) |
| `--agent-cmd <command>` | Custom command template for generic harness |
| `-f, --format <type>` | Output format: `terminal`, `json`, or `markdown` (default: `terminal`) |
| `-o, --output <path>` | Write report to file |
| `--trials <n>` | Runs per test case |
| `--pass-threshold <n>` | Trials that must pass |
| `--timeout <seconds>` | Per-case timeout |
| `--max-cost <dollars>` | Budget cap for test run |
| `--dry` | Show test plan without executing |
| `--update-baseline` | Accept current results as new baseline |
| `--ci` | Strict exit codes (exit 1 on regressions) |
| `--provider <name>` | LLM provider for rubric grading: `anthropic`, `openai`, `google` |
| `--model <id>` | Model for rubric grading |
| `--verbose` | Show per-grader results |

```bash
# Run all skill tests
skills-check test

# Test a specific skill
skills-check test --skill react-patterns

# Dry run — show test plan only
skills-check test --dry

# CI mode with regression detection
skills-check test --ci

# Set a budget cap
skills-check test --max-cost 5.00

# Use Claude Code as the agent harness
skills-check test --agent claude-code
```

### `skills-check fingerprint [dir]`

Generate a fingerprint registry of installed skills with content hashes and watermarks for integrity verification and runtime detection.

| Flag | Description |
|------|-------------|
| `-o, --output <path>` | Write registry to file |
| `--inject-watermarks` | Add watermark comments to skills that lack them |
| `--json` | Output as JSON |
| `--ci` | Strict exit codes |
| `--verbose` | Show progress and details |
| `--quiet` | Suppress output, exit code only |

**Exit codes:** `0` = success, `2` = configuration error.

**Output format (JSON):**

```json
{
  "skills": [
    {
      "name": "react-patterns",
      "version": "1.2.0",
      "fingerprints": {
        "watermark": "sk_abc123...",
        "frontmatter_sha256": "e3b0c44...",
        "content_sha256": "a1b2c3d...",
        "content_prefix_sha256": "f4e5d6c..."
      },
      "token_count": 1842,
      "path": "skills/react/SKILL.md"
    }
  ]
}
```

```bash
# Fingerprint all skills in current directory
skills-check fingerprint

# Output as JSON
skills-check fingerprint ./skills --json

# Write registry to file
skills-check fingerprint ./skills -o fingerprints.json

# Inject watermarks into skills that lack them
skills-check fingerprint ./skills --inject-watermarks

# Quiet mode for CI (exit code only)
skills-check fingerprint --quiet
```

### `skills-check usage`

Analyze skill telemetry events to track usage frequency, version drift, cost estimation, and enforce usage policies.

| Flag | Description |
|------|-------------|
| `--store <uri>` | Telemetry store URI (`file://path.jsonl` or `sqlite://path.db`) |
| `--since <date>` | Filter events after this date |
| `--until <date>` | Filter events before this date |
| `--check-policy` | Cross-reference usage against `.skill-policy.yml` |
| `--policy <path>` | Path to policy file |
| `--detailed` | Show detailed per-skill breakdown |
| `--format <fmt>` | Output format: `terminal`, `json`, `markdown` |
| `--json` | Shorthand for `--format json` |
| `--markdown` | Shorthand for `--format markdown` |
| `-o, --output <path>` | Write output to file |
| `--ci` | Strict exit codes |
| `--fail-on <severity>` | Fail threshold for policy violations |
| `--verbose` | Show progress |
| `--quiet` | Suppress output |

**Exit codes:** `0` = success, `1` = policy violations detected, `2` = configuration error.

```bash
# Analyze usage from a JSONL telemetry file
skills-check usage --store file://telemetry.jsonl

# Filter to last 30 days
skills-check usage --store file://telemetry.jsonl --since 2026-02-06

# Detailed per-skill breakdown
skills-check usage --store sqlite://telemetry.db --detailed

# Cross-reference usage against policy
skills-check usage --store file://telemetry.jsonl --check-policy

# JSON output for CI
skills-check usage --store file://telemetry.jsonl --json

# Markdown report to file
skills-check usage --store file://telemetry.jsonl --markdown -o usage-report.md

# CI mode with policy enforcement
skills-check usage --store file://telemetry.jsonl --check-policy --ci --fail-on violation
```

### `skills-check refresh [skills-dir]`

Use an LLM to propose targeted updates to stale skill files. Fetches changelogs, generates diffs, and optionally applies changes.

| Flag | Description |
|------|-------------|
| `-r, --registry <path>` | Path to registry file |
| `-p, --product <name>` | Refresh a single product |
| `--provider <name>` | LLM provider: `anthropic`, `openai`, `google` |
| `--model <id>` | Specific model ID (e.g. `claude-sonnet-4-20250514`) |
| `-y, --yes` | Auto-apply without confirmation |
| `--dry-run` | Show proposed changes, write nothing |

**Provider setup:** Install a provider SDK and set the API key:

```bash
# Anthropic (Claude)
npm install @ai-sdk/anthropic
export ANTHROPIC_API_KEY=sk-...

# OpenAI
npm install @ai-sdk/openai
export OPENAI_API_KEY=sk-...

# Google (Gemini)
npm install @ai-sdk/google
export GOOGLE_GENERATIVE_AI_API_KEY=...
```

The skills directory is resolved in priority order:
1. CLI argument: `skills-check refresh ./my-skills`
2. Registry field: `"skillsDir": "./skills"` in skills-check.json
3. Default: `./skills`

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All checks pass / no findings above threshold |
| `1` | Findings detected at or above the configured threshold |
| `2` | Configuration error (missing registry, bad format, invalid options) |

## Registry Format

The `skills-check.json` file maps products to npm packages:

```json
{
  "$schema": "https://skillscheck.ai/schema.json",
  "version": 1,
  "lastCheck": "2026-02-28T00:00:00Z",
  "products": {
    "ai-sdk": {
      "displayName": "Vercel AI SDK",
      "package": "ai",
      "verifiedVersion": "6.0.105",
      "verifiedAt": "2026-02-28T00:00:00Z",
      "changelog": "https://github.com/vercel/ai/releases",
      "skills": ["ai-sdk-core", "ai-sdk-tools", "ai-sdk-react"],
      "agents": ["ai-sdk-engineer"]
    }
  }
}
```

## Skill Frontmatter

Skills declare their product version in YAML frontmatter:

```yaml
---
name: ai-sdk-core
description: "Generate text with Vercel AI SDK..."
product-version: "6.0.105"
---
```

The `init` command reads this field and groups skills by shared version + name prefix.

## CI Integration

### GitHub Action

The `voodootikigod/skills-check` action runs one or more skills-check commands in your CI pipeline. By default it runs `check` only (backward-compatible). Enable additional commands via the `commands` input or individual toggle flags.

```yaml
- uses: voodootikigod/skills-check@v1
  with:
    commands: check,audit,lint,budget
    audit-fail-on: high
    lint-fail-on: error
    budget-max-tokens: 50000
```

The action requires `issues: write` permission when `open-issues` is enabled.

#### Inputs

**Command selection:**

| Input | Default | Description |
|-------|---------|-------------|
| `commands` | `""` | Comma-separated list of commands to run (e.g. `check,audit,lint`). Overrides individual toggle flags when set. |
| `check` | `"true"` | Run the `check` command (version drift detection) |
| `audit` | `"false"` | Run the `audit` command (security & hallucination detection) |
| `lint` | `"false"` | Run the `lint` command (metadata validation) |
| `budget` | `"false"` | Run the `budget` command (token cost analysis) |
| `policy` | `"false"` | Run the `policy check` command (organizational rule enforcement) |
| `verify` | `"false"` | Run the `verify` command (semver bump validation) |
| `test` | `"false"` | Run the `test` command (eval test suites) |
| `fingerprint` | `"false"` | Run the `fingerprint` command (generate skill fingerprint registry) |
| `usage` | `"false"` | Run the `usage` command (analyze skill usage from telemetry) |

**Command-specific thresholds:**

| Input | Default | Description |
|-------|---------|-------------|
| `audit-fail-on` | `"high"` | Audit severity threshold: `critical`, `high`, `medium`, `low` |
| `lint-fail-on` | `"error"` | Lint level threshold: `error`, `warning` |
| `budget-max-tokens` | `""` | Token ceiling -- fail if total exceeds this value (empty = no limit) |
| `policy-file` | `""` | Path to `.skill-policy.yml` (empty = auto-detect) |
| `policy-fail-on` | `"blocked"` | Policy severity threshold: `blocked`, `violation`, `warning` |
| `usage-store` | `""` | Telemetry store URI for the `usage` command (e.g. `file://telemetry.jsonl` or `sqlite://telemetry.db`) |
| `usage-check-policy` | `"false"` | Cross-reference usage data against skill policy |

**Shared options:**

| Input | Default | Description |
|-------|---------|-------------|
| `skills-dir` | `"."` | Directory containing skill files to analyze |
| `registry` | `"skills-check.json"` | Path to registry file |
| `node-version` | `"22"` | Node.js version |

**Check-specific options (backward-compatible):**

| Input | Default | Description |
|-------|---------|-------------|
| `open-issues` | `"true"` | Open/update GitHub issue on staleness |
| `issue-label` | `"skill-staleness"` | Label for issue deduplication |
| `fail-on-stale` | `"false"` | Exit non-zero when stale products found |
| `token` | `${{ github.token }}` | GitHub token (needs `issues: write`) |

#### Outputs

| Output | Description |
|--------|-------------|
| `stale-count` | Number of stale products (0 if current) |
| `issue-number` | Issue number created/updated (empty if none) |
| `report` | Full markdown report from the check command |
| `results` | JSON object with exit codes from each command that ran (e.g. `{"check":0,"audit":1}`) |
| `fingerprint-skills` | Number of skills fingerprinted |
| `usage-calls` | Total number of skill usage calls |

#### Examples

**Staleness check only (default, backward-compatible):**

```yaml
- uses: voodootikigod/skills-check@v1
  with:
    fail-on-stale: "true"
```

**Full quality gate with multiple commands:**

```yaml
- uses: voodootikigod/skills-check@v1
  with:
    commands: check,audit,lint,budget
    audit-fail-on: high
    lint-fail-on: error
    budget-max-tokens: 50000
    fail-on-stale: "true"
```

**Security-focused PR gate:**

```yaml
- uses: voodootikigod/skills-check@v1
  with:
    commands: audit,lint
    audit-fail-on: medium
    lint-fail-on: warning
    open-issues: "false"
```

**Policy enforcement:**

```yaml
- uses: voodootikigod/skills-check@v1
  with:
    commands: policy
    policy-file: .skill-policy.yml
    policy-fail-on: violation
```

**Using individual toggle flags instead of `commands`:**

```yaml
- uses: voodootikigod/skills-check@v1
  with:
    check: "true"
    audit: "true"
    lint: "true"
    audit-fail-on: critical
```

**Weekly cron with staleness issues:**

```yaml
name: Skill Quality Check
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
          budget-max-tokens: 100000
          fail-on-stale: "false"
```

**PR gate example:**

```yaml
- uses: voodootikigod/skills-check@v1
  with:
    commands: check,audit,lint
    open-issues: "false"
    fail-on-stale: "true"
    audit-fail-on: high
    lint-fail-on: error
```

**Using the results output:**

```yaml
- uses: voodootikigod/skills-check@v1
  id: skills-check
  with:
    commands: check,audit
- run: echo "Results: ${{ steps.skills-check.outputs.results }}"
```

#### Setup

Create the deduplication label once:

```bash
gh label create skill-staleness --color "#e4e669" --description "Skill version drift detected"
```

### Inline CLI

For simpler setups, run individual commands directly:

```yaml
- name: Check skill freshness
  run: npx skills-check check --ci

- name: Audit skill security
  run: npx skills-check audit --fail-on high --quiet

- name: Lint skill metadata
  run: npx skills-check lint --ci --fail-on error

- name: Check token budget
  run: npx skills-check budget --max-tokens 50000 --format json

- name: Enforce policy
  run: npx skills-check policy check --ci --fail-on violation

- name: Generate skill fingerprints
  run: npx skills-check fingerprint --json -o fingerprints.json

- name: Analyze skill usage
  run: npx skills-check usage --store file://telemetry.jsonl --check-policy --ci
```

## Complementary Tools

- [`npx skills`](https://skills.sh) -- registry + installer for Agent Skills
- `skills-check` -- quality & integrity layer (this tool)
- [`skills`](https://github.com/anthropics/skills) -- official Agent Skills reference

## License

MIT
