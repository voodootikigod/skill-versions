# Deprecation & Yanking

> **Owner:** 📦 skills.sh / npx skills (propose to maintainer)
> **Priority:** 🟡 Quadrant 2 — Lower Novelty, High Impact
> **Novelty:** ★★☆☆☆ | **Impact:** ★★★★☆

## Summary

A mechanism for skill authors to mark skills as deprecated (soft warning) or yanked (hard block on new installs), plus tooling to surface these signals to consumers. Follows Cargo's model where yanking is more nuanced than npm's `unpublish` — yanked versions still resolve for existing lockfiles but are blocked for new installations.

## Why This Matters

Skills have a unique failure mode: a skill that teaches deprecated patterns is actively harmful, not just unhelpful. An agent following a yanked skill might install packages with known vulnerabilities, use removed APIs, or apply anti-patterns. Unlike code libraries where deprecated functions still compile, deprecated skill content causes agents to produce broken output with no compile-time error.

Currently there's no way for a skill author to signal "stop using this." The skill just sits there, silently giving bad advice.

## Lifecycle States

```
active → deprecated → yanked → removed
  │                      │
  │                      └─ still resolves from lockfile
  └─ normal usage             but blocked for new installs
```

### Active
Normal state. Skill is installable and recommended.

### Deprecated
Soft signal. Skill is still installable but a warning is displayed. Author provides a reason and an optional replacement.

```yaml
---
name: pages-router-patterns
deprecated:
  since: "2026-02-15"
  reason: "Pages Router is legacy. Use App Router patterns instead."
  replacement: "nextjs-patterns --features app-router"
---
```

### Yanked
Hard block on new installations. Existing lockfile references still resolve (to avoid breaking existing projects), but `skills add` and `skills update` will not install a yanked version.

Yanking is typically triggered by:
- Security vulnerability in the skill's instructions
- Hallucinated package references discovered after publication
- Skill content that causes agent misbehavior

### Removed
Fully removed from the registry. This is rare and should only happen for legal reasons (DMCA, license violation) or malicious content. Existing lockfile references will fail to resolve.

## Frontmatter Extension (Spec Proposal)

```yaml
---
name: my-skill
status: active          # active | deprecated | yanked
deprecated:             # present only if status is deprecated
  since: "2026-02-15"
  reason: "Replaced by improved version"
  replacement: "new-skill-name"
  sunset: "2026-06-15"  # optional: date when this will be yanked
yanked:                 # present only if status is yanked
  since: "2026-03-01"
  reason: "Contains hallucinated package reference (CVE-SKILL-2026-001)"
  advisory: "https://skill-advisories.dev/SKILL-2026-001"
---
```

## CLI Behavior (skills.sh)

### For Skill Authors

```bash
# Deprecate a skill
npx skills deprecate my-skill \
  --reason "Use new-skill instead" \
  --replacement new-skill

# Yank a skill version
npx skills yank my-skill@1.2.0 \
  --reason "Hallucinated package reference in line 45"

# Undo a yank (within grace period)
npx skills unyank my-skill@1.2.0
```

### For Skill Consumers

```bash
# Install shows deprecation warnings
$ npx skills add old-patterns
⚠ DEPRECATED: old-patterns is deprecated since 2026-02-15.
  Reason: "Use new-patterns instead"
  Replacement: npx skills add new-patterns
  Install anyway? [y/N]

# Install blocks yanked skills
$ npx skills add bad-skill@1.2.0
✗ YANKED: bad-skill@1.2.0 was yanked on 2026-03-01.
  Reason: "Contains hallucinated package reference"
  Advisory: https://skill-advisories.dev/SKILL-2026-001
  Use a different version or an alternative skill.

# List deprecated/yanked skills in project
$ npx skills status
  ✓ ai-sdk-core@6.1.0 — active
  ⚠ old-patterns@2.0.0 — deprecated (replacement: new-patterns)
  ✗ bad-deploy@1.2.0 — yanked (advisory: SKILL-2026-001)
```

## skillsafe Integration

skillsafe can check deprecation/yank status as part of its health checks:

```bash
$ npx skillsafe check
  ai-sdk-core:  ✓ Current (6.1.0, product matches 6.1.x)
  old-patterns:  ⚠ Deprecated — replacement available: new-patterns
  bad-deploy:    ✗ YANKED — see advisory SKILL-2026-001
  legacy-tool:   ⚠ Stale — product-version 4.0 but latest is 5.0
```

The `check` command already reports staleness; adding deprecation/yank status is a natural extension.

## Implementation Considerations

### Registry Storage
For GitHub-sourced skills, deprecation/yank metadata lives in the SKILL.md frontmatter itself (the author updates the file). For a centralized registry, it would be stored server-side.

### Grace Period for Yanks
Allow authors to unyank within 48 hours (matching npm's unpublish window). After 48 hours, yanking is permanent and requires registry admin intervention to reverse.

### Lockfile Interaction
- **Deprecated** skills: `skills ci` installs normally but prints a warning
- **Yanked** skills: `skills ci` installs from lockfile (preserving determinism) but prints a prominent warning. `skills update` will skip the yanked version and install the next non-yanked version.
- **Removed** skills: `skills ci` fails. The lockfile reference is broken.

### Advisory Database
Yanked skills should be recorded in the advisory database (same one used by `skillsafe audit`). This creates a feedback loop: audit checks for yanked dependencies, yank events populate the advisory database.

## File Structure (skills.sh side)

```
src/
  lifecycle/
    types.ts              # Status enum, deprecation/yank metadata types
    deprecate.ts          # Author-facing deprecation command
    yank.ts               # Author-facing yank command
    status.ts             # Consumer-facing status check
    lockfile.ts           # Lockfile-aware resolution (skip yanked for new installs)
```

## File Structure (skillsafe side)

```
src/
  checkers/
    lifecycle.ts          # Check deprecation/yank status in health reports
  advisory/
    client.ts             # Query advisory database for yanked skills
```

## Success Criteria

- Deprecated skills show clear warnings with replacement guidance
- Yanked skills are blocked for new installs but resolve from existing lockfiles
- `skillsafe check` surfaces lifecycle status alongside staleness info
- Advisory database is populated when skills are yanked
