# Mandatory Metadata Validation

> **Owner:** 📦 skills.sh (enforce on publish) + 🔧 skills-check (lint/validate)
> **Priority:** 🟡 Quadrant 2 — Lower Novelty, High Impact
> **Novelty:** ★★☆☆☆ | **Impact:** ★★★★☆

## Summary

Raise the quality floor of the skill ecosystem by requiring essential metadata in SKILL.md frontmatter — enforced at publish time by the registry and available as a local linting step via skills-check. This is the `crates.io` model: you can write whatever you want locally, but publishing requires `description`, `license`, and `repository` at minimum.

## Current State

The Agent Skills spec currently requires only `name` and `description` in frontmatter. In practice, many published skills are missing:
- Author information
- License
- Product-version (when referencing a specific product)
- Agent compatibility information
- Minimum skill spec version

This makes it impossible to filter, audit, or trust skills at scale.

## Proposed Metadata Schema

### Required (enforced on publish)

```yaml
---
name: "ai-sdk-core"                  # Already required
description: "Core patterns for..."  # Already required
author: "vercel-labs"                 # NEW: Who maintains this
license: "MIT"                        # NEW: Usage terms
repository: "https://github.com/..." # NEW: Source of truth
---
```

### Conditionally Required

```yaml
---
product-version: "6.1.105"           # Required IF skill references a specific product
agents:                               # Required IF skill is agent-specific
  - "claude-code"
  - "cursor"
---
```

### Recommended (warning if missing, not blocking)

```yaml
---
spec-version: "1.0"                  # Which version of the agent skills spec
keywords:                             # Discovery tags
  - "ai"
  - "sdk"
  - "vercel"
min-context: 2000                     # Minimum context tokens needed
---
```

## Two-Layer Enforcement

### Layer 1: skills-check lint (local, advisory)

```bash
# Lint all skills for metadata completeness
npx skills-check lint

# Output:
# ai-sdk-core/SKILL.md
#   ✓ name: present
#   ✓ description: present
#   ✗ author: missing (required for publish)
#   ✗ license: missing (required for publish)
#   ⚠ keywords: missing (recommended)
#   ✓ product-version: 6.1.105
#
# 2 errors, 1 warning across 1 skill

# Lint with auto-fix (adds template fields)
npx skills-check lint --fix

# Lint in CI mode
npx skills-check lint --ci --fail-on error
```

### Layer 2: skills.sh publish (registry, blocking)

```bash
# Publish rejects incomplete metadata
$ npx skills publish
✗ Cannot publish: missing required fields
  - author (who maintains this skill?)
  - license (what are the usage terms?)
  Add these to your SKILL.md frontmatter and try again.
```

## Validation Rules

```typescript
const validationRules = {
  // Always required
  name: { required: true, type: 'string', maxLength: 100 },
  description: { required: true, type: 'string', minLength: 20, maxLength: 500 },
  author: { required: true, type: 'string' },
  license: { required: true, type: 'string', validate: isSpdxLicense },
  repository: { required: true, type: 'string', validate: isUrl },

  // Conditionally required
  'product-version': {
    required: (content) => referencesProduct(content),
    type: 'string',
    validate: isSemver
  },
  agents: {
    required: (content) => hasAgentSpecificInstructions(content),
    type: 'array',
    items: 'string'
  },

  // Recommended
  'spec-version': { recommended: true, type: 'string' },
  keywords: { recommended: true, type: 'array', items: 'string', minItems: 1 },
};
```

### Product Reference Detection

The conditional `product-version` requirement triggers when the skill content references a specific product. Detection heuristics:
- Mentions a product name + version number (e.g., "Next.js 15", "AI SDK 6.x")
- Contains `npm install` / `pip install` commands for specific packages
- References product-specific APIs or configuration files

## Implementation Considerations

### Gradual Rollout
- Phase 1: `lint` command available, advisory only
- Phase 2: `publish` enforces `name`, `description`, `author`, `license`
- Phase 3: `publish` enforces conditional fields (`product-version`, `agents`)
- Each phase announced with migration guide

### License Validation
Use SPDX license identifiers for validation. Accept both standard identifiers (`MIT`, `Apache-2.0`) and SPDX expressions (`MIT OR Apache-2.0`).

### Auto-fix Capability
`skills-check lint --fix` can:
- Add `author` from git config (`git config user.name`)
- Add `repository` from git remote (`git remote get-url origin`)
- Add template `license: "MIT"` with a TODO comment
- Add `product-version` by detecting product references in content and querying npm for latest version

## File Structure (skills-check side)

```
src/
  commands/
    lint.ts                 # CLI command handler
  lint/
    index.ts                # Orchestrator
    rules/
      required.ts           # Required field checks
      conditional.ts        # Conditionally required checks
      recommended.ts        # Recommended field checks
      format.ts             # Field format validation (semver, URL, SPDX)
    detection/
      product-refs.ts       # Detect product references in content
      agent-specific.ts     # Detect agent-specific instructions
    autofix.ts              # Auto-fix missing fields from context
    reporters/
      terminal.ts
      json.ts
```

## Success Criteria

- `lint` catches 95%+ of metadata issues before publish
- `--fix` successfully auto-fills `author` and `repository` from git context
- Product reference detection has < 15% false positive rate
- Published skills in the registry have complete metadata within 3 months of enforcement
