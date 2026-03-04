# Template / Parameterized Skills

> **Owner:** 📦 skills.sh (propose to maintainer)
> **Priority:** 🟢 Quadrant 3 — High Novelty, Lower Impact (invest strategically)
> **Novelty:** ★★★★☆ | **Impact:** ★★★☆☆

## Summary

A mechanism for skills to declare configurable parameters that are filled in at install time, producing a customized instance of the skill. Analogous to Cargo's "prebuilt vs. build-from-source" distinction, or Cookiecutter/Yeoman templates — but for agent instructions rather than project scaffolding.

## The Problem

Enterprises need skills that follow their internal conventions:
- Company A uses `src/components/` for React; Company B uses `app/ui/`
- Team X deploys with Vercel; Team Y deploys with AWS
- Org-wide API naming conventions, error handling patterns, logging formats

Today, every team forks the public skill and maintains their own copy. Forked skills drift from upstream and miss updates. Template skills solve this by letting the public skill declare parameters that are filled in per-organization.

## Proposed Convention

### Skill Declaration

```yaml
---
name: react-patterns
description: "React component patterns with configurable conventions"
parameters:
  component_dir:
    description: "Directory path for components"
    type: string
    default: "src/components"
  state_management:
    description: "Preferred state management library"
    type: enum
    options: ["zustand", "jotai", "redux-toolkit", "none"]
    default: "zustand"
  test_framework:
    description: "Testing framework"
    type: enum
    options: ["vitest", "jest"]
    default: "vitest"
  company_prefix:
    description: "Component name prefix for your organization"
    type: string
    default: ""
    optional: true
---

# React Component Patterns

## File Structure

Place all components in `{{component_dir}}/`:

```
{{component_dir}}/
  Button/
    Button.tsx
    Button.test.tsx
    index.ts
```

## State Management

Use {{state_management}} for application state.

{{#if state_management == "zustand"}}
Create stores in `src/stores/`:
...zustand-specific patterns...
{{/if}}

{{#if state_management == "jotai"}}
Create atoms in `src/atoms/`:
...jotai-specific patterns...
{{/if}}

## Testing

Write tests using {{test_framework}}:
...
```

### Installation With Parameters

```bash
# Interactive parameter prompting
npx skills add react-patterns --configure
# Prompts for each parameter with defaults shown

# Inline parameter specification
npx skills add react-patterns \
  --param component_dir="app/ui" \
  --param state_management="jotai" \
  --param test_framework="vitest"

# From a configuration file
npx skills add react-patterns --params .skill-params/react.yaml
```

### Parameter Configuration File

```yaml
# .skill-params/react.yaml
component_dir: "app/ui"
state_management: "jotai"
test_framework: "vitest"
company_prefix: "Acme"
```

## Template Rendering

At install time, the CLI:
1. Reads the parameterized SKILL.md
2. Prompts for or reads parameter values
3. Renders the template (replacing `{{param}}` and evaluating `{{#if}}` blocks)
4. Writes the rendered SKILL.md to the skill directory
5. Records the parameter values in the lockfile for reproducibility

The agent sees only the rendered skill — no template syntax.

## Implementation Considerations

### Template Engine
Use Handlebars or Mustache for rendering. These are simple, well-understood, and don't require a build step. The template syntax (`{{param}}`, `{{#if}}`) is readable in raw SKILL.md files.

### Parameter Validation
- `type: string` — any string value
- `type: enum` — must be one of the declared options
- `type: boolean` — true/false, controls `{{#if}}` blocks
- `type: number` — numeric value (e.g., max retries)
- `optional: true` — parameter can be omitted (empty string)

### Upstream Updates
When the template skill is updated upstream, the consumer's rendered instance needs re-rendering with their saved parameters. This slots into the existing update flow:

```bash
npx skills update react-patterns
# Fetches new template, re-renders with saved parameters
# Shows diff of rendered output for review
```

### Lockfile Integration
The lockfile should record parameter values:

```json
{
  "react-patterns": {
    "source": "github",
    "commit": "abc123...",
    "parameters": {
      "component_dir": "app/ui",
      "state_management": "jotai"
    }
  }
}
```

This ensures `skills ci` reproduces the exact same rendered skill.

### Relationship to Feature Flags
Parameters and feature flags are complementary:
- **Feature flags** = which *topics* to include (broad content selection)
- **Parameters** = how to *customize* included content (fine-grained values)

A skill can use both: feature flags to select which sections load, and parameters to customize the content within those sections.

## File Structure (skills.sh side)

```
src/
  templates/
    parser.ts             # Parse parameter declarations from frontmatter
    validator.ts          # Validate parameter values against schema
    renderer.ts           # Handlebars/Mustache rendering
    prompt.ts             # Interactive parameter prompting
    state.ts              # Read/write parameter configuration files
  commands/
    add.ts                # Extended with --configure and --param flags
    update.ts             # Re-render with saved parameters on update
```

## Success Criteria

- Template rendering produces clean SKILL.md with no template artifacts
- Parameters are persisted in lockfile for reproducible installs
- Upstream updates re-render correctly with saved parameters
- Interactive prompting provides clear defaults and validation
