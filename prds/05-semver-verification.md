# Semver for Knowledge / Version Verification

> **Owner:** 🔧 skillsafe
> **Priority:** 🔴 Quadrant 1 — High Novelty, High Impact
> **Novelty:** ★★★★☆ | **Impact:** ★★★★☆

## Summary

A framework for defining what semantic versioning means for knowledge artifacts (not code), plus a CLI tool (`skillsafe verify`) that analyzes content changes between skill versions and validates that the version bump matches the actual scope of change. This is `cargo semver-checks` adapted for prose and instructions rather than API surfaces.

## The Problem

Code has clear semantics for versioning: removing a public function is a major change, adding one is minor, fixing a bug is a patch. Skills have no equivalent vocabulary. When a skill's `product-version` bumps from 6.0 to 7.0, does that mean the skill was rewritten, or did someone just update a version number without changing content? Conversely, when content changes significantly but the version doesn't bump, nobody knows.

This matters for trust. If `skillsafe check` reports a skill is current (version matches), but the content is actually stale, the version number is lying. If `skillsafe refresh` bumps a version after AI-assisted updates, how do we know the bump magnitude is appropriate?

## Proposed Knowledge Versioning Vocabulary

### Major Change (product-version major bump)
- The upstream product renamed or removed core APIs referenced in the skill
- The skill's primary workflow or recommended approach changed fundamentally
- Package names or import paths changed (e.g., `@vercel/workflow` → `workflow`)
- A skill section was removed or restructured in a way that changes agent behavior

### Minor Change (product-version minor bump)
- New features or APIs were added to the skill's coverage
- New sections or patterns were documented
- Alternative approaches were added alongside existing ones
- The skill expanded its scope without invalidating existing content

### Patch Change (product-version patch bump)
- Typo fixes, clarification of existing instructions
- Version number updates in code examples that don't change behavior
- URL updates for documentation links
- Minor rewording for clarity without changing the instructed approach

## CLI Interface

```bash
# Verify that a skill's version bump matches its content changes
npx skillsafe verify --skill ai-sdk-core

# Compare two versions of a skill
npx skillsafe verify --before skills/v1/ai-sdk-core/ --after skills/v2/ai-sdk-core/

# Verify all skills in a repo against their git history
npx skillsafe verify --all

# Auto-suggest the appropriate version bump
npx skillsafe verify --suggest --skill ai-sdk-core

# Verify after a refresh
npx skillsafe refresh && npx skillsafe verify
```

## Output Format

```
Version Verification: ai-sdk-core
==================================================

Declared change: 6.0.105 → 6.1.0 (minor)

Content analysis:
  ✓ 2 new sections added (Server Actions, Edge Runtime)
  ✓ No sections removed
  ✓ No core API patterns changed
  ✓ 3 code examples updated (version numbers only)

Assessment: ✓ MINOR bump is appropriate
  New content was added without removing or contradicting
  existing instructions. A minor bump correctly signals
  that existing users won't see regressions.

──────────────────────────────────────────────────

Version Verification: deploy-helper
==================================================

Declared change: 2.0.0 → 2.0.1 (patch)

Content analysis:
  ⚠ Package reference changed: @vercel/deploy → vercel-deploy
  ⚠ Primary CLI command changed: `vercel deploy` → `vc deploy`
  ○ 4 code examples substantially rewritten

Assessment: ✗ PATCH bump appears INSUFFICIENT
  Package rename and CLI command change are breaking changes
  that would cause agents to use incorrect commands.
  Recommended: MAJOR bump (3.0.0)
```

## Implementation Architecture

### Content Diff Analysis

```
skillsafe verify
  ├── Get previous version of SKILL.md (from git history or --before)
  ├── Get current version of SKILL.md
  ├── Structural diff:
  │   ├── Section-level comparison (headings added/removed/renamed)
  │   ├── Code block extraction and comparison
  │   ├── Package/command reference extraction and comparison
  │   └── URL extraction and comparison
  ├── Semantic diff (LLM-assisted):
  │   ├── "Do these two versions give the agent contradictory instructions?"
  │   ├── "Would an agent following version A produce different output than version B?"
  │   └── "Are there breaking changes in the recommended approach?"
  ├── Version bump classification:
  │   ├── Apply heuristic rules (package rename → major, new section → minor, etc.)
  │   ├── Weight LLM assessment
  │   └── Compare against declared bump
  └── Report
```

### Heuristic Rules (Fast, Deterministic)

```typescript
interface ChangeSignal {
  type: 'major' | 'minor' | 'patch';
  reason: string;
  confidence: number;
}

const rules: Rule[] = [
  // Major signals
  { pattern: /package renamed|import path changed/i, type: 'major', confidence: 0.9 },
  { pattern: /deprecated|removed|no longer/i, type: 'major', confidence: 0.7 },
  { pattern: /breaking change/i, type: 'major', confidence: 0.9 },

  // Minor signals
  { pattern: /new section|added support|new feature/i, type: 'minor', confidence: 0.7 },
  { signal: 'section_added', type: 'minor', confidence: 0.8 },
  { signal: 'code_blocks_increased', type: 'minor', confidence: 0.6 },

  // Patch signals
  { signal: 'only_version_numbers_changed', type: 'patch', confidence: 0.8 },
  { signal: 'only_urls_changed', type: 'patch', confidence: 0.7 },
  { signal: 'content_similarity_above_95pct', type: 'patch', confidence: 0.7 },
];
```

### LLM-Assisted Analysis (Deeper, Slower)

For cases where heuristics are uncertain, use an LLM to compare the two versions:

```
Given these two versions of an agent skill:

VERSION A:
{previous_content}

VERSION B:
{current_content}

Classify the change as:
- MAJOR: Instructions changed in ways that would cause an agent to produce different (incompatible) output
- MINOR: New instructions added that expand capability without contradicting existing ones
- PATCH: Clarifications, typo fixes, or trivial updates that don't change agent behavior

Explain your reasoning.
```

### Combination Strategy

1. Run heuristic rules (fast, free)
2. If heuristics agree with high confidence (> 0.8), use that result
3. If heuristics are uncertain or disagree, run LLM analysis
4. Compare combined assessment against declared version bump
5. Report match or mismatch

## Integration with Existing skillsafe Pipeline

This slots directly into the existing workflow:

```bash
npx skillsafe check        # Find stale skills
npx skillsafe refresh       # AI-assisted update
npx skillsafe verify        # Validate the version bump
npx skillsafe test          # Run regression tests
```

The `verify` step ensures that the AI-assisted refresh correctly classified the magnitude of its changes.

## File Structure

```
src/
  commands/
    verify.ts               # CLI command handler
  verify/
    index.ts                # Orchestrator
    diff/
      structural.ts         # Section, code block, reference diffs
      content.ts            # Text similarity measurement
      packages.ts           # Package reference comparison
    classifier/
      heuristics.ts         # Rule-based classification
      llm.ts                # LLM-assisted classification
      combined.ts           # Combine heuristic + LLM results
    git.ts                  # Get previous version from git history
    reporters/
      terminal.ts
      json.ts
```

## Success Criteria

- Correctly classifies package renames as major changes
- Correctly classifies new-section additions as minor changes
- Correctly classifies typo-only fixes as patch changes
- Heuristic-only mode runs in < 2 seconds per skill
- LLM-assisted mode runs in < 15 seconds per skill
- Integrates cleanly with the existing check → refresh pipeline
