# Dependency Groups / Contextual Loading

> **Owner:** 📐 Spec (convention) + 📦 skills.sh (resolution)
> **Priority:** 🟡 Quadrant 2 — Lower Novelty, High Impact
> **Novelty:** ★★★☆☆ | **Impact:** ★★★★☆

## Summary

A convention for organizing skills into named groups that load based on context — analogous to Poetry's dependency groups (`[tool.poetry.group.dev.dependencies]`) or npm's `devDependencies`. Different from feature flags (which control *what capabilities* within a single skill), dependency groups control *which skills* load for a given workflow.

## The Problem

A project might have 15 installed skills, but not all are relevant at all times:

- **Core skills** (always loaded): coding-standards, error-handling, typescript-patterns
- **Debug skills** (loaded when troubleshooting): debugging-guide, logging-best-practices, profiler-setup
- **Review skills** (loaded during code review): security-checklist, accessibility-audit, performance-review
- **Deploy skills** (loaded for deployment): ci-cd-patterns, infrastructure-as-code, rollback-procedures

Loading all 15 skills for every agent interaction wastes context tokens and dilutes attention. Loading only the relevant group saves tokens and improves agent focus.

## Proposed Convention

### Project-Level Declaration

In the project's skill configuration file (`.claude/skills.yaml` or `skills.config.yaml`):

```yaml
groups:
  core:
    description: "Always loaded for any task"
    always: true
    skills:
      - coding-standards
      - error-handling
      - typescript-patterns

  debug:
    description: "Loaded when debugging or troubleshooting"
    triggers:
      - "debug"
      - "troubleshoot"
      - "fix bug"
      - "error"
      - "not working"
    skills:
      - debugging-guide
      - logging-best-practices
      - profiler-setup

  review:
    description: "Loaded during code review"
    triggers:
      - "review"
      - "audit"
      - "check for"
    skills:
      - security-checklist
      - accessibility-audit
      - performance-review

  deploy:
    description: "Loaded for deployment tasks"
    triggers:
      - "deploy"
      - "release"
      - "CI/CD"
      - "pipeline"
    skills:
      - ci-cd-patterns
      - infrastructure-as-code
      - rollback-procedures

  all:
    description: "Load everything"
    includes: [core, debug, review, deploy]
```

### Group Loading Behavior

1. **Always groups** load on every agent interaction (the `always: true` field)
2. **Triggered groups** load when the prompt matches any of their trigger patterns
3. **Manual groups** load only when explicitly requested (`--group deploy`)
4. Groups can include other groups for composition

### CLI Integration (skills.sh)

```bash
# Install a skill into a specific group
npx skills add debugging-guide --group debug

# List skills by group
npx skills list --by-group

# Manually load a specific group for a session
npx skills load --group deploy

# Show which groups would activate for a given prompt
npx skills match "help me debug this authentication error"
# Output: core (always), debug (matched: "debug", "error")
```

## Implementation Considerations

### Trigger Matching
Group triggers are keyword/phrase matches, not complex classifiers. Start simple:
- Case-insensitive substring matching against the user's prompt
- An agent can also explicitly request a group via tool use
- False positives are acceptable because loading an extra group is just extra context, not an error

### Relationship to Feature Flags
These are complementary, not competing:
- **Feature flags** = within a skill, which sections to include
- **Dependency groups** = across skills, which skills to load
- A skill in a group can also have feature flags. Both filters apply.

### Context Budget Integration
`skillsafe budget` should report per-group token costs:

```
Context Budget by Group
─────────────────────────
core (always):     6,200 tokens
debug:             4,800 tokens
review:            5,100 tokens
deploy:            3,900 tokens
─────────────────────────
Worst case (all):  20,000 tokens
Typical (core+1):  ~11,000 tokens
```

### Agent Support
Requires the agent's skill loader to understand groups. For agents that don't support it, fall back to loading all skills (backward compatible). The group configuration file is an optimization hint, not a hard requirement.

## File Structure (skills.sh side)

```
src/
  groups/
    parser.ts             # Parse group declarations
    matcher.ts            # Prompt-to-group matching
    resolver.ts           # Resolve group inclusions
    loader.ts             # Group-aware skill loading
  commands/
    add.ts                # Extended with --group flag
    list.ts               # Extended with --by-group flag
    load.ts               # Manual group loading
    match.ts              # Preview which groups a prompt activates
```

## File Structure (skillsafe side)

```
src/
  budget/
    groups.ts             # Per-group token budget reporting
```

## Success Criteria

- A project with 15 skills loads only 3-5 for typical interactions
- Group trigger matching adds < 10ms to skill loading
- Token savings measurable via `skillsafe budget --by-group`
- Backward compatible: projects without groups.yaml work unchanged
