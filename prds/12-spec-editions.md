# Spec Editions

> **Owner:** 📐 Agent Skills Spec (agentskills.io)
> **Priority:** 🟢 Quadrant 3 — High Novelty, Lower Impact (invest strategically)
> **Novelty:** ★★★★☆ | **Impact:** ★★★☆☆

## Summary

A versioning mechanism for the Agent Skills spec itself, modeled on Rust editions (2015, 2018, 2021, 2024). Editions let the spec evolve — adding new required fields, changing default behaviors, introducing new conventions — without breaking existing skills. A skill declares which edition it targets, and tools handle backward compatibility.

## Why This Will Matter (But Not Yet)

Today the spec is minimal: `name` and `description`. As proposals accumulate (product-version, feature flags, dependency groups, test conventions, mandatory metadata, classifiers), the spec needs a way to introduce breaking changes without invalidating the thousands of existing skills that don't use them.

Without editions, the spec is frozen at its first version forever — or every change breaks existing skills. Editions solve this by letting skills opt in to new conventions explicitly.

This is premature if only one or two new fields are in flight. It becomes critical once 3+ breaking conventions are proposed simultaneously.

## Proposed Mechanism

### Edition Declaration

```yaml
---
edition: "2026"
name: my-skill
description: "..."
product-version: "15.2.0"
features:
  default: [app-router]
  available:
    app-router: { section: "## App Router" }
---
```

### Edition Definitions

```yaml
# Edition 2025 (current baseline)
# - name and description required
# - all other fields optional
# - no enforced conventions for test directories or feature flags

# Edition 2026 (proposed)
# - name, description, author, license required
# - product-version conditionally required
# - features field recognized
# - tests/ directory convention recognized
# - spec-version field recommended

# Edition 2027 (future)
# - dependency groups convention
# - classifiers field
# - template parameters convention
```

### Tool Behavior

Tools read the `edition` field and adjust validation accordingly:

```typescript
function validateSkill(skill: SkillFile): ValidationResult {
  const edition = skill.frontmatter.edition || '2025'; // default

  if (edition >= '2026') {
    // Enforce 2026 requirements
    requireField(skill, 'author');
    requireField(skill, 'license');
    validateFeatureFlags(skill);
  }

  if (edition >= '2027') {
    // Enforce 2027 requirements
    validateClassifiers(skill);
  }
}
```

### Migration Path

```bash
# Check if a skill is compatible with a newer edition
npx skills-check edition check --target 2026

# Auto-migrate a skill to a newer edition
npx skills-check edition migrate --target 2026
# Adds missing required fields, restructures as needed

# Show what changed between editions
npx skills-check edition diff 2025 2026
```

## Implementation Considerations

### Default Edition
Skills without an `edition` field default to the oldest edition ("2025"). This ensures backward compatibility — existing skills don't break when a new edition is released.

### Edition Cadence
Annual editions (matching the year) keep the pace manageable and predictable. Not every year needs a new edition — only release one when there are enough accumulated changes to justify it.

### Tooling Support
Every tool in the ecosystem (skills-check, skills.sh, agent loaders) reads the edition field and adjusts behavior. This is the social contract: tools agree to support older editions indefinitely, but new features only work at the edition where they're introduced.

## File Structure (skills-check side)

```
src/
  editions/
    registry.ts           # Edition definitions and their requirements
    validator.ts          # Edition-aware validation
    migrator.ts           # Auto-migration between editions
    diff.ts               # Show changes between editions
  commands/
    edition.ts            # CLI command handler (check, migrate, diff)
```

## Success Criteria

- Skills without an edition field continue to work unchanged
- Migration tool successfully upgrades skills between editions
- New features are cleanly gated behind edition checks
- Edition cadence is documented and predictable
