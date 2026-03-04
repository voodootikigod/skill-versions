# Feature Flags / Optional Capabilities for Agent Skills

> **Owner:** 📐 Agent Skills Spec + 📦 skills.sh (implementation)
> **Priority:** 🔴 Quadrant 1 — High Novelty, High Impact
> **Novelty:** ★★★★★ | **Impact:** ★★★★★

## Summary

A convention for declaring optional sub-capabilities within a skill, allowing consumers to activate only the relevant subset. This directly addresses context window economics — the most expensive constraint unique to LLM-loaded artifacts.

## Why This Matters

A "Next.js" skill today must choose between being comprehensive (covering App Router, Pages Router, i18n, Server Actions, middleware, etc.) and being focused. Comprehensive skills waste context tokens on knowledge the developer doesn't need. Focused skills require maintaining many small variants.

Feature flags solve this by letting a single skill declare capabilities that are activated at install or load time. The agent only receives the relevant portions, reducing context consumption while maintaining a single source of truth for the skill author.

Cargo's `[features]` system is the closest analog, but the skill version is more impactful because context windows have hard token limits and direct cost implications — unlike RAM, which is abundant and cheap.

## Proposed Specification Extension

### Frontmatter Declaration

```yaml
---
name: nextjs-patterns
description: "Best practices for building Next.js applications"
product-version: "15.2.0"
features:
  default: [app-router, typescript]
  available:
    app-router:
      description: "App Router patterns (layouts, loading, error boundaries)"
      section: "## App Router"
    pages-router:
      description: "Pages Router patterns (getServerSideProps, getStaticProps)"
      section: "## Pages Router"
    typescript:
      description: "TypeScript configuration and type patterns"
      section: "## TypeScript"
    i18n:
      description: "Internationalization setup and routing"
      section: "## Internationalization"
      requires: [app-router]
    server-actions:
      description: "Server Actions patterns and validation"
      section: "## Server Actions"
      requires: [app-router]
    middleware:
      description: "Edge middleware patterns"
      section: "## Middleware"
---
```

### SKILL.md Content Structure

Each feature maps to a marked section within the SKILL.md. The `section` field in frontmatter identifies which heading corresponds to which feature. Content outside any feature section is always included (preamble, common patterns).

```markdown
# Next.js Patterns

Common patterns that apply regardless of router choice...

## App Router
<!-- feature: app-router -->
App Router specific content here...

### Layouts
...

### Loading States
...

## Pages Router
<!-- feature: pages-router -->
Pages Router specific content here...

## TypeScript
<!-- feature: typescript -->
TypeScript patterns here...

## Server Actions
<!-- feature: server-actions -->
Server Actions patterns here...
Requires App Router.

## Internationalization
<!-- feature: i18n -->
i18n setup here...

## Middleware
<!-- feature: middleware -->
Middleware patterns here...
```

### Feature Dependencies

Features can declare `requires` to express that activating `i18n` also requires `app-router`. The resolution is straightforward:

1. Start with explicitly activated features
2. For each activated feature, recursively add its `requires`
3. Deduplicate
4. Extract corresponding sections from the SKILL.md

### Feature Exclusions (Optional)

Some features are mutually exclusive:

```yaml
features:
  conflicts:
    - [app-router, pages-router]  # Can't use both simultaneously
```

## Installation Interface (skills.sh)

```bash
# Install with default features
npx skills add vercel-labs/agent-skills --skill nextjs-patterns

# Install with specific features
npx skills add vercel-labs/agent-skills --skill nextjs-patterns --features app-router,server-actions,typescript

# Install with all features
npx skills add vercel-labs/agent-skills --skill nextjs-patterns --features all

# Install with no optional features (minimal)
npx skills add vercel-labs/agent-skills --skill nextjs-patterns --features none

# List available features for a skill
npx skills info vercel-labs/agent-skills --skill nextjs-patterns --show-features
```

## Loading Behavior

When an agent loads a skill with feature flags, the loading mechanism (whether it's Claude Code, Cursor, or another tool) should:

1. Read the skill's frontmatter to determine activated features
2. Extract only the sections corresponding to activated features (plus the always-included preamble)
3. Pass the filtered content to the agent's context

This requires the agent's skill loader to understand the feature flag convention. For agents that don't support it, the full SKILL.md is loaded as-is (backward compatible).

### Feature Activation State

The activated features should be persisted alongside the installed skill:

```json
// .claude/skills/nextjs-patterns/.features.json
{
  "activated": ["app-router", "server-actions", "typescript"],
  "resolved": ["app-router", "server-actions", "typescript"]
}
```

## Implementation Considerations

### Backward Compatibility
- Skills without a `features` field work exactly as they do today
- Agents that don't understand feature flags load the full SKILL.md
- The feature flag mechanism is purely additive to the spec

### Authoring Experience
- Skill authors mark sections with HTML comments (`<!-- feature: name -->`) or rely on heading-level mapping from frontmatter
- A `skillsafe lint` command could validate that all declared features have corresponding sections and vice versa
- Feature boundaries should be at heading level (## or ###), not inline

### Context Budget Integration
- Feature flags directly feed into context budget analysis
- `skillsafe budget ./skills/ --features app-router,typescript` would report token counts for only the activated features
- This creates a feedback loop: authors can see which features are expensive and optimize accordingly

### Gradual Adoption
- Existing skills can add features incrementally — start by marking the two most distinct sub-topics as features, leave everything else in the always-included preamble
- No skill needs to be rewritten entirely to adopt feature flags

## Spec Proposal (for agentskills.io discussion)

The proposal to the Agent Skills spec would add:

1. An optional `features` field in YAML frontmatter with `default`, `available`, and optionally `conflicts` sub-fields
2. Each feature entry has `description`, `section` (heading reference), and optional `requires`
3. A convention for section demarcation (HTML comments or heading-level mapping)
4. A recommendation that agents supporting progressive disclosure should implement feature-aware loading

## File Structure for Implementation (skills.sh side)

```
src/
  features/
    parser.ts           # Parse feature declarations from frontmatter
    resolver.ts         # Resolve feature dependencies and conflicts
    filter.ts           # Filter SKILL.md content to activated features
    state.ts            # Read/write .features.json
  commands/
    add.ts              # Extended with --features flag
    info.ts             # Extended with --show-features
```

## File Structure for Implementation (skillsafe side)

```
src/
  commands/
    lint.ts             # Validate feature declarations match content
    budget.ts           # Token counting respects feature flags
  features/
    validate.ts         # Check all features have sections, no orphans
    measure.ts          # Token count per feature
```

## Testing Strategy

- Unit tests for feature resolution (dependency chains, conflict detection, circular dependency rejection)
- Unit tests for content filtering (given a SKILL.md and a feature set, produce correct subset)
- Integration test with a real multi-feature skill loaded into an agent harness
- Backward compatibility test: skill with features loaded by an agent that doesn't support them

## Success Criteria

- A 5000-token skill with 4 features should load at ~1500 tokens when only 1 feature is activated
- No regressions for skills without feature flags
- Feature resolution completes in < 50ms
- Works with at least Claude Code and Cursor
