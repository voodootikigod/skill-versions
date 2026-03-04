# Policy Enforcement (cargo deny for Skills)

> **Owner:** 🔧 skillsafe
> **Priority:** 🟡 Quadrant 2 — Lower Novelty, High Impact
> **Novelty:** ★★★☆☆ | **Impact:** ★★★★☆

## Summary

A policy-as-code tool (`skillsafe policy`) that enforces organizational rules about which skills are allowed, required, or banned. This is `cargo deny` adapted for the skill ecosystem — the gate-keeper that enterprises need before they'll adopt skills at scale.

## Why This Matters

Without policy enforcement, any developer can install any skill from any source. For a personal project, this is fine. For an enterprise with compliance requirements, it's a non-starter. Security teams need to say "only skills from these approved sources" and have that enforced in CI, not just documented in a wiki.

## Policy File Format

`.skill-policy.yml` at the project or organization root:

```yaml
version: 1

# Trusted sources — only skills from these sources are allowed
sources:
  allow:
    - "anthropics/skills"           # Official Anthropic skills
    - "vercel-labs/agent-skills"    # Official Vercel skills
    - "our-org/*"                   # Any repo in our GitHub org
    - "npm:@our-org/*"              # Any npm package in our scope
  deny:
    - "untrusted-user/*"            # Block a specific source
  # If allow is specified, everything not in allow is implicitly denied

# Required skills — these must be installed in every project
required:
  - source: "our-org/engineering-skills"
    skill: "coding-standards"
  - source: "our-org/engineering-skills"
    skill: "security-review"

# Banned skills — these must NOT be installed
banned:
  - skill: "deploy-to-prod-yolo"
    reason: "Bypasses deployment safety checks"

# Metadata requirements — skills must have these fields
metadata:
  required_fields:
    - "name"
    - "description"
    - "product-version"
  require_license: true
  allowed_licenses:
    - "MIT"
    - "Apache-2.0"
    - "BSD-2-Clause"
    - "BSD-3-Clause"

# Content rules
content:
  # Ban specific patterns in skill content
  deny_patterns:
    - pattern: "curl.*\\|.*bash"
      reason: "Piping remote scripts to bash is prohibited"
    - pattern: "chmod\\s+777"
      reason: "World-writable permissions are prohibited"
    - pattern: "--force|--no-verify"
      reason: "Force flags bypass safety checks"

  # Require specific patterns
  require_patterns:
    - pattern: "## Error Handling"
      reason: "All skills must document error handling"

# Staleness policy
freshness:
  max_age_days: 90                  # Skills older than 90 days trigger warning
  max_version_drift: "minor"        # Allow minor version drift, flag major
  require_product_version: true     # All product-referencing skills must declare it

# Audit integration
audit:
  require_clean: true               # skillsafe audit must pass
  min_severity_to_block: "high"     # Block on high+ findings
```

## CLI Interface

```bash
# Check all installed skills against policy
npx skillsafe policy check

# Check against a specific policy file
npx skillsafe policy check --policy .skill-policy.yml

# Check a specific skill
npx skillsafe policy check --skill ai-sdk-core

# Generate a starter policy file
npx skillsafe policy init

# Validate policy file syntax
npx skillsafe policy validate

# CI mode: strict exit codes
npx skillsafe policy check --ci
```

## Output Format

```
Policy Check: .skill-policy.yml
==================================================

BLOCKED (1):
  ✗ skills/rogue-deploy/SKILL.md
    Source "random-user/sketchy-skills" is not in the allow list.
    Only skills from approved sources may be installed.

VIOLATIONS (2):
  ✗ skills/quick-setup/SKILL.md
    Line 23: Contains `curl https://setup.io/go | bash`
    Policy: "Piping remote scripts to bash is prohibited"

  ✗ skills/legacy-tool/SKILL.md
    Missing required field: product-version
    Policy: "All skills must declare product-version"

WARNINGS (1):
  ⚠ skills/old-patterns/SKILL.md
    Last verified 142 days ago (max: 90 days)
    Policy: "Skills older than 90 days trigger warning"

REQUIRED (satisfied):
  ✓ coding-standards installed
  ✓ security-review installed

Summary: 1 blocked, 2 violations, 1 warning. Policy check FAILED.
```

## Implementation Considerations

### Inheritance
Support policy inheritance for monorepos:
- Organization-level policy at `~/.config/skillsafe/policy.yml`
- Project-level policy at `.skill-policy.yml` (extends or overrides org policy)
- Workspace-level policies in subdirectories (further refinement)

### Integration with Audit
The `audit.require_clean` setting runs `skillsafe audit` as part of the policy check. This means a single `policy check` command can enforce both organizational rules AND security audit findings.

### Pre-install Hook
If integrated with skills.sh, policy check could run before installation:
```bash
npx skills add random-user/skills --policy .skill-policy.yml
# ERROR: Source "random-user/skills" is not in the allow list.
# Installation blocked by policy.
```

## File Structure

```
src/
  commands/
    policy.ts               # CLI command handler (check, init, validate)
  policy/
    index.ts                # Orchestrator
    parser.ts               # Parse .skill-policy.yml
    validators/
      sources.ts            # Allow/deny source checking
      required.ts           # Required skills verification
      banned.ts             # Banned skills checking
      metadata.ts           # Frontmatter field requirements
      content.ts            # Pattern-based content rules
      freshness.ts          # Staleness policy
      audit.ts              # Audit integration
    reporters/
      terminal.ts
      json.ts
    init.ts                 # Generate starter policy file
```

## Success Criteria

- Policy check for 50 skills completes in < 5 seconds
- Source allow/deny lists correctly gate installation
- Content pattern matching has < 5% false positive rate
- Integrates with skillsafe audit as a single check
- Starter policy file is useful out of the box
