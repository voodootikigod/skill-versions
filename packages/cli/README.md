# skills-check

Quality & integrity layer for [Agent Skills](https://agentskills.io) — like `npm outdated` for skill knowledge.

Skills that reference versioned products (via `product-version` in frontmatter) can drift as upstream packages ship new releases. `skills-check` detects this drift and reports which skills need updating.

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

```
skills-check
==================================================

STALE (2):
  Vercel AI SDK            6.0.105 → 6.1.0 (minor)
    skills: ai-sdk-core, ai-sdk-tools, ai-sdk-react

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

### 4. AI-assisted refresh

Use an LLM to propose targeted updates to stale skill files:

```bash
# Interactive — review each change
skills-check refresh ./skills

# Auto-apply all changes
skills-check refresh -y

# Preview only (no writes)
skills-check refresh --dry-run
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

### `skills-check refresh [skills-dir]`

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

The `skills-check.json` file maps products to npm packages:

```json
{
  "$schema": "https://skillscheck.ai/schema.json",
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
  run: npx skills-check check --ci
```

A reusable [GitHub Action](https://github.com/voodootikigod/skills-check) is also available with automated issue creation and weekly cron support.

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
