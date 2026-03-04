# skillsafe

Quality & integrity layer for [Agent Skills](https://agentskills.io) — like `npm outdated` for skill knowledge.

Skills that reference versioned products (via `product-version` in frontmatter) can drift as upstream packages ship new releases. `skillsafe` detects this drift and reports which skills need updating.

## Install

```bash
npm install -g skillsafe
```

Or run directly:

```bash
npx skillsafe check
```

## Quick Start

### 1. Initialize a registry

Scan your skills directory and map products to npm packages:

```bash
# Interactive — prompts for each mapping
skillsafe init ./skills

# Non-interactive — auto-detects common packages
skillsafe init ./skills --yes
```

This creates a `skillsafe.json` registry file.

### 2. Check for staleness

```bash
skillsafe check
```

```
skillsafe
==================================================

STALE (2):
  Vercel AI SDK            6.0.105 → 6.1.0 (minor)
    skills: ai-sdk-core, ai-sdk-tools, ai-sdk-react

  Payload CMS              3.78.0 → 3.80.0 (minor)
    skills: payload-core, payload-data, payload-admin

CURRENT (15): upstash-redis, next, turbo, ...

Run "skillsafe report --format markdown" for a full report.
```

### 3. Generate a report

```bash
# Markdown (for PRs, issues, dashboards)
skillsafe report --format markdown > STALENESS.md

# JSON (for automation)
skillsafe report --format json
```

### 4. AI-assisted refresh

Use an LLM to propose targeted updates to stale skill files:

```bash
# Interactive — review each change
skillsafe refresh ./skills

# Auto-apply all changes
skillsafe refresh -y

# Preview only (no writes)
skillsafe refresh --dry-run
```

Requires a provider SDK and API key:

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

## CLI Reference

### `skillsafe init [dir]`

Scan a skills directory and generate a `skillsafe.json` registry.

| Flag | Description |
|------|-------------|
| `-y, --yes` | Non-interactive mode, auto-detect package mappings |
| `-o, --output <path>` | Output path for registry file |

### `skillsafe check`

Check skill versions against the npm registry.

| Flag | Description |
|------|-------------|
| `-r, --registry <path>` | Path to registry file (default: `./skillsafe.json`) |
| `-p, --product <name>` | Check a single product |
| `--json` | Machine-readable JSON output |
| `-v, --verbose` | Show all products including current |
| `--ci` | Exit code 1 if any stale products found |

### `skillsafe report`

Generate a full staleness report.

| Flag | Description |
|------|-------------|
| `-r, --registry <path>` | Path to registry file |
| `-f, --format <type>` | Output format: `json` or `markdown` (default: `markdown`) |

### `skillsafe refresh [skills-dir]`

Use an LLM to propose targeted updates to stale skill files.

| Flag | Description |
|------|-------------|
| `-r, --registry <path>` | Path to registry file |
| `-p, --product <name>` | Refresh a single product |
| `--provider <name>` | LLM provider: `anthropic`, `openai`, `google` |
| `--model <id>` | Specific model ID (e.g. `claude-sonnet-4-20250514`) |
| `-y, --yes` | Auto-apply without confirmation |
| `--dry-run` | Show proposed changes, write nothing |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All products current |
| `1` | Stale products found (with `--ci` flag) |
| `2` | Configuration error (missing registry, bad format) |

## Registry Format

The `skillsafe.json` file maps products to npm packages:

```json
{
  "$schema": "https://skillsafe.sh/schema.json",
  "version": 1,
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

## CI Integration

```yaml
# GitHub Actions — fail if any skills are stale
- name: Check skill freshness
  run: npx skillsafe check --ci
```

A reusable [GitHub Action](https://github.com/voodootikigod/skillsafe) is also available with automated issue creation and weekly cron support.

## Skill Frontmatter

Skills declare their product version in YAML frontmatter:

```yaml
---
name: ai-sdk-core
product-version: "6.0.105"
---
```

The `init` command reads this field and groups skills by shared version + name prefix.

## License

MIT
