# Structured Taxonomy / Classifiers

> **Owner:** 📦 skills.sh + 📐 Spec
> **Priority:** 🟢 Quadrant 3 — Medium Novelty, Lower Impact
> **Novelty:** ★★★☆☆ | **Impact:** ★★★☆☆

## Summary

A structured classification system for skills — analogous to PyPI classifiers (`Framework :: Django`, `Topic :: Scientific/Engineering`) — that enables precise filtering, discovery, and compatibility checking. Better than freeform keywords because the vocabulary is controlled and hierarchical.

## The Problem

Finding the right skill today requires knowing its name or searching freeform descriptions. As the ecosystem grows past hundreds of skills, keyword search breaks down. "React" matches skills for React Native, React Email, React Three Fiber, and React web. "Deploy" matches Vercel deploy, AWS deploy, Docker deploy, and CI/CD patterns.

Classifiers provide structured dimensions for filtering: give me skills for React web + TypeScript + Claude Code + intermediate complexity.

## Proposed Classifier Vocabulary

```yaml
# Hierarchical classifiers — each level narrows the filter
classifiers:
  # What agent(s) is this skill designed for?
  - "Agent :: Claude Code"
  - "Agent :: Cursor"
  - "Agent :: Codex"
  - "Agent :: Universal"          # Works with any agent

  # What domain does this skill address?
  - "Domain :: Frontend"
  - "Domain :: Backend"
  - "Domain :: DevOps"
  - "Domain :: Data Science"
  - "Domain :: Mobile"
  - "Domain :: Security"

  # What product/framework does it target?
  - "Product :: Next.js :: 15"
  - "Product :: AI SDK :: 6"
  - "Product :: React :: 19"
  - "Product :: PostgreSQL :: 16"

  # What type of skill is it?
  - "Type :: Patterns"            # Best practices and conventions
  - "Type :: Setup"               # Project scaffolding and configuration
  - "Type :: Debugging"           # Troubleshooting and diagnostics
  - "Type :: Migration"           # Upgrading between versions
  - "Type :: Reference"           # API reference and documentation

  # What complexity level?
  - "Complexity :: Beginner"
  - "Complexity :: Intermediate"
  - "Complexity :: Advanced"

  # What license?
  - "License :: MIT"
  - "License :: Apache-2.0"
```

### Usage in Frontmatter

```yaml
---
name: nextjs-app-router
description: "App Router patterns for Next.js 15"
classifiers:
  - "Agent :: Claude Code"
  - "Agent :: Cursor"
  - "Domain :: Frontend"
  - "Product :: Next.js :: 15"
  - "Type :: Patterns"
  - "Complexity :: Intermediate"
  - "License :: MIT"
---
```

### Discovery Queries

```bash
# Find all frontend skills for Claude Code
npx skills search --classifier "Agent :: Claude Code" --classifier "Domain :: Frontend"

# Find all Next.js 15 skills
npx skills search --classifier "Product :: Next.js :: 15"

# Find beginner-friendly setup skills
npx skills search --classifier "Type :: Setup" --classifier "Complexity :: Beginner"
```

## Implementation Considerations

### Controlled Vocabulary
The classifier vocabulary is maintained as a registry (JSON file in the spec repo or skills.sh repo). New classifiers are added through PRs, not invented ad-hoc by skill authors. This prevents the namespace pollution that makes freeform tags useless at scale.

### Validation
`skillsafe lint` validates that classifiers in a skill's frontmatter are recognized values. Unrecognized classifiers produce warnings (not errors) to allow for gradual vocabulary expansion.

### Relationship to Keywords
Classifiers supplement, not replace, freeform `keywords`. Keywords handle the long tail that classifiers can't predict. Classifiers handle the structured dimensions that matter for filtering.

### Compatibility Checking
Classifiers enable automatic compatibility warnings:

```bash
$ npx skills add some-cursor-only-skill
⚠ This skill is classified as "Agent :: Cursor" only.
  You're using Claude Code. It may not work as expected.
  Install anyway? [y/N]
```

## File Structure (skills.sh side)

```
src/
  classifiers/
    vocabulary.ts         # Controlled classifier vocabulary
    parser.ts             # Parse classifiers from frontmatter
    search.ts             # Classifier-based search/filter
    compatibility.ts      # Agent compatibility checking
```

## File Structure (skillsafe side)

```
src/
  lint/
    rules/
      classifiers.ts      # Validate classifiers against vocabulary
```

## Success Criteria

- Classifier vocabulary covers 90%+ of existing skills without requiring "Other"
- Search by classifier returns relevant results with > 80% precision
- Agent compatibility warnings catch mismatches before installation
- Vocabulary is extensible without breaking existing skills
