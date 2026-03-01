# skill-versions

Freshness checker for [Agent Skills](https://agentskills.io) — like `npm outdated` for skill knowledge.

Skills that reference versioned products (via `product-version` in frontmatter) can drift as upstream packages ship new releases. `skill-versions` detects this drift and reports which skills need updating.

## Install

```bash
npm install -g skill-versions
```

Or run directly:

```bash
npx skill-versions check
```

## Quick Start

### 1. Initialize a registry

Scan your skills directory and map products to npm packages:

```bash
# Interactive — prompts for each mapping
skill-versions init ./skills

# Non-interactive — auto-detects common packages
skill-versions init ./skills --yes
```

This creates a `skill-versions.json` registry file.

### 2. Check for staleness

```bash
skill-versions check
```

Output:

```
skill-versions
==================================================

STALE (2):
  Vercel AI SDK            6.0.105 → 6.1.0 (minor)
    skills: ai-sdk-core, ai-sdk-tools, ai-sdk-react, ai-sdk-multimodal

  Payload CMS              3.78.0 → 3.80.0 (minor)
    skills: payload-core, payload-data, payload-admin

CURRENT (15): upstash-redis, next, turbo, ...

Run "skill-versions report --format markdown" for a full report.
```

### 3. Generate a report

```bash
# Markdown (for PRs, issues, dashboards)
skill-versions report --format markdown > STALENESS.md

# JSON (for automation)
skill-versions report --format json
```

## CLI Reference

### `skill-versions init [dir]`

Scan a skills directory and generate a `skill-versions.json` registry.

| Flag | Description |
|------|-------------|
| `-y, --yes` | Non-interactive mode, auto-detect package mappings |
| `-o, --output <path>` | Output path for registry file |

### `skill-versions check`

Check skill versions against the npm registry.

| Flag | Description |
|------|-------------|
| `-r, --registry <path>` | Path to registry file (default: `./skill-versions.json`) |
| `-p, --product <name>` | Check a single product |
| `--json` | Machine-readable JSON output |
| `-v, --verbose` | Show all products including current |
| `--ci` | Exit code 1 if any stale products found |

### `skill-versions report`

Generate a full staleness report.

| Flag | Description |
|------|-------------|
| `-r, --registry <path>` | Path to registry file |
| `-f, --format <type>` | Output format: `json` or `markdown` (default: `markdown`) |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All products current |
| `1` | Stale products found (with `--ci` flag) |
| `2` | Configuration error (missing registry, bad format) |

## Registry Format

The `skill-versions.json` file maps products to npm packages:

```json
{
  "$schema": "https://skill-versions.dev/schema.json",
  "version": 1,
  "lastCheck": "2026-02-28T00:00:00Z",
  "products": {
    "ai-sdk": {
      "displayName": "Vercel AI SDK",
      "package": "ai",
      "verifiedVersion": "6.0.105",
      "verifiedAt": "2026-02-28T00:00:00Z",
      "changelog": "https://github.com/vercel/ai/releases",
      "skills": ["ai-sdk-core", "ai-sdk-tools", "ai-sdk-react"]
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

```yaml
# GitHub Actions
- name: Check skill freshness
  run: npx skill-versions check --ci
```

## Complementary Tools

- [`npx skills`](https://skills.sh) — registry + installer for Agent Skills
- `skill-versions` — freshness checker (this tool)
- [`skills`](https://github.com/anthropics/skills) — official Agent Skills reference

## License

MIT
