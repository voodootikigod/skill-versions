import { commands } from "@/lib/commands";

function formatCommand(cmd: (typeof commands)[number]): string {
	const lines: string[] = [];

	lines.push(`### ${cmd.name}`);
	lines.push("");
	lines.push(cmd.description);
	lines.push("");

	if (cmd.whyItMatters) {
		lines.push(`**Why it matters:** ${cmd.whyItMatters}`);
		lines.push("");
	}

	if (cmd.whatItDoes.length > 0) {
		lines.push("**What it does:**");
		for (const item of cmd.whatItDoes) {
			lines.push(`- ${item}`);
		}
		lines.push("");
	}

	lines.push(`**Usage:** \`${cmd.usage}\``);
	lines.push("");

	if (cmd.options.length > 0) {
		lines.push("**Options:**");
		for (const opt of cmd.options) {
			lines.push(`- \`${opt.flag}\` — ${opt.description}`);
		}
		lines.push("");
	}

	if (cmd.examples.length > 0) {
		lines.push("**Examples:**");
		lines.push("");
		for (const ex of cmd.examples) {
			lines.push(`${ex.label}:`);
			lines.push("```");
			lines.push(ex.code);
			lines.push("```");
			lines.push("");
		}
	}

	if (cmd.ciTip) {
		lines.push(`**CI tip:** ${cmd.ciTip}`);
		lines.push("");
	}

	return lines.join("\n");
}

export function GET() {
	const groupedCommands = new Map<string, (typeof commands)[number][]>();
	for (const cmd of commands) {
		const group = cmd.group;
		if (!groupedCommands.has(group)) {
			groupedCommands.set(group, []);
		}
		groupedCommands.get(group)?.push(cmd);
	}

	const commandSections: string[] = [];
	for (const [group, cmds] of groupedCommands) {
		commandSections.push(`## ${group}`);
		commandSections.push("");
		for (const cmd of cmds) {
			commandSections.push(formatCommand(cmd));
		}
	}

	const body = `# Skills Check — Complete Reference

> The missing quality toolkit for Agent Skills

skills-check is the quality and integrity layer for Agent Skills (SKILL.md files). It provides 10 commands covering freshness detection, security auditing, metadata linting, token budget analysis, semver verification, policy enforcement, and eval testing.

Agent Skills are markdown documents with YAML frontmatter that instruct AI coding agents (Claude Code, Cursor, Codex, etc.) how to work with specific products, frameworks, and patterns. Skills look like documentation but are treated as executable instructions by agents with file system and shell access. This makes skill quality a security and correctness concern, not just a readability one.

skills-check sits alongside skills.sh (which handles installation, discovery, and distribution) as the complementary verification layer. skills.sh installs them, skills-check keeps them safe.

## Installation

No installation required. Run directly with npx:

\`\`\`
npx skills-check check
\`\`\`

Or install globally:

\`\`\`
npm install -g skills-check
\`\`\`

## Commands Overview

| Command | Group | Description |
|---------|-------|-------------|
${commands.map((cmd) => `| ${cmd.name} | ${cmd.group} | ${cmd.tagline} |`).join("\n")}

---

${commandSections.join("\n")}

---

## Registry Format (skills-check.json)

The \`skills-check.json\` file maps product names to npm packages, tracks verified versions, and lists associated skill/agent files. It follows a JSON Schema available at https://skillscheck.ai/schema.json.

### Structure

\`\`\`json
{
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
}
\`\`\`

### Fields

- \`$schema\` — URL to the JSON Schema for editor validation
- \`version\` — Schema version (currently 1)
- \`products\` — Map of product names to their configuration:
  - \`displayName\` — Human-readable product name
  - \`package\` — npm package name used for version lookups
  - \`verifiedVersion\` — Last verified version string
  - \`verifiedAt\` — ISO 8601 timestamp of last verification
  - \`skills\` — Array of skill file names (without .md extension)
  - \`agents\` — Array of agent file names (without .md extension)

---

## SKILL.md Frontmatter Specification

Each SKILL.md file should include YAML frontmatter with the following fields:

### Required Fields

- \`name\` — Unique identifier for the skill (e.g., "ai-sdk-core")
- \`description\` — Brief description of what the skill covers

### Recommended Fields

- \`product-version\` — Semver version of the product this skill targets (e.g., "4.2.0"). Required for version drift detection via \`check\`.
- \`author\` — Skill author name or organization
- \`license\` — SPDX license identifier (e.g., "MIT", "Apache-2.0"). Supports OR/AND expressions.
- \`repository\` — URL to the skill's source repository

### Example

\`\`\`yaml
---
name: ai-sdk-core
description: Core patterns for the Vercel AI SDK
product-version: "4.2.0"
author: "Your Name"
license: "MIT"
repository: "https://github.com/your-org/skills"
---

# AI SDK Core

Your skill content here...
\`\`\`

---

## GitHub Action

The \`voodootikigod/skills-check\` action runs one or more skills-check commands in your CI pipeline.

### Basic Usage

\`\`\`yaml
- uses: voodootikigod/skills-check@v1
  with:
    commands: check,audit,lint,budget
    audit-fail-on: high
    lint-fail-on: error
    budget-max-tokens: 50000
\`\`\`

### Command Selection Inputs

| Input | Default | Description |
|-------|---------|-------------|
| commands | "" | Comma-separated list (e.g., check,audit,lint). Overrides toggle flags. |
| check | true | Run version drift detection |
| audit | false | Run security and hallucination detection |
| lint | false | Run metadata validation |
| budget | false | Run token cost analysis |
| policy | false | Run policy enforcement |
| verify | false | Run semver bump validation |
| test | false | Run eval test suites |

### Threshold Inputs

| Input | Default | Description |
|-------|---------|-------------|
| audit-fail-on | high | Severity threshold: critical, high, medium, low |
| lint-fail-on | error | Level threshold: error or warning |
| budget-max-tokens | "" | Token ceiling (empty = no limit) |
| policy-file | "" | Path to .skill-policy.yml |
| policy-fail-on | blocked | Threshold: blocked, violation, warning |

### Shared Inputs

| Input | Default | Description |
|-------|---------|-------------|
| skills-dir | . | Directory containing skill files |
| registry | skills-check.json | Path to registry file |
| node-version | 22 | Node.js version |
| open-issues | true | Open/update GitHub issue on staleness |
| fail-on-stale | false | Exit non-zero when stale |

### Outputs

| Output | Description |
|--------|-------------|
| stale-count | Number of stale products (0 if current) |
| issue-number | Issue number created/updated (empty if none) |
| report | Full markdown report from check |
| results | JSON with per-command exit codes |

### Full Quality Gate Example

\`\`\`yaml
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
          fail-on-stale: "true"
\`\`\`

---

## LLM Provider Setup

For AI-assisted commands (\`refresh\`, \`verify\`, \`test\`), install a provider SDK and set the API key:

### Anthropic (Claude)
\`\`\`
npm install @ai-sdk/anthropic
export ANTHROPIC_API_KEY=sk-...
\`\`\`

### OpenAI
\`\`\`
npm install @ai-sdk/openai
export OPENAI_API_KEY=sk-...
\`\`\`

### Google (Gemini)
\`\`\`
npm install @ai-sdk/google
export GOOGLE_GENERATIVE_AI_API_KEY=...
\`\`\`

---

## Links

- npm: https://www.npmjs.com/package/skills-check
- GitHub: https://github.com/voodootikigod/skills-check
- Documentation: https://skillscheck.ai/docs
- JSON Schema: https://skillscheck.ai/schema.json
`;

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
}
