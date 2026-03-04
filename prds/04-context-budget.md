# Context Budget Analysis

> **Owner:** 🔧 skills-check
> **Priority:** 🔴 Quadrant 1 — High Novelty, High Impact
> **Novelty:** ★★★★★ | **Impact:** ★★★★☆

## Summary

A CLI tool (`skills-check budget`) that measures and reports the token cost of installed skills, identifies redundancy between skills, and helps authors and consumers optimize context window usage. This is `bundlephobia` for the skill ecosystem — but unlike bundle size for JavaScript, token cost for skills directly impacts agent performance, latency, and monetary cost.

## Why This Is Novel

Every other package ecosystem measures cost in bytes (disk space, download size, memory). Skills are measured in tokens, and tokens have three unique properties:

1. **Hard ceiling** — Context windows have fixed limits (100K-200K tokens). Unlike disk space, you can't just add more.
2. **Direct cost** — Every token loaded costs money per API call. A 5000-token skill loaded 100 times/day at $3/MTok = $1.50/day.
3. **Attention dilution** — Larger contexts don't just cost more, they degrade agent performance. The agent has to attend to more content, and important instructions can be lost in the noise.

No tool in any ecosystem measures this.

## CLI Interface

```bash
# Measure all installed skills
npx skills-check budget

# Measure a specific skill
npx skills-check budget --skill ai-sdk-core

# Measure with feature flags applied
npx skills-check budget --skill nextjs-patterns --features app-router,typescript

# Measure transitive cost (skill + its dependencies)
npx skills-check budget --skill fullstack-react --include-deps

# Compare two configurations
npx skills-check budget --compare before.json after.json

# Output as JSON for CI integration
npx skills-check budget --format json

# Set a budget limit (fails if exceeded)
npx skills-check budget --max-tokens 50000

# Detailed breakdown by section
npx skills-check budget --skill ai-sdk-core --detailed
```

## Output Format

```
Context Budget Report
==================================================

Skill                      Tokens    % of 128K    Est. Cost/1K calls
─────────────────────────────────────────────────────────────────────
ai-sdk-core                 2,340      1.8%         $0.007
ai-sdk-tools                3,120      2.4%         $0.009
nextjs-patterns [2/6]       4,890      3.8%         $0.015
  (app-router)              2,100
  (typescript)              1,200
  (preamble)                1,590
frontend-design             6,210      4.9%         $0.019
deploy-helper               1,450      1.1%         $0.004
─────────────────────────────────────────────────────────────────────
Total (all loaded)         18,010     14.1%         $0.054

Redundancy detected:
  ⚠ ai-sdk-core and ai-sdk-tools share ~800 tokens of overlapping
    content (TypeScript setup instructions). Consider consolidating
    into a shared dependency or using feature flags.

Budget: 18,010 / 128,000 tokens (14.1% of context used by skills)
```

## Implementation Architecture

```
skills-check budget [options]
  ├── Discover installed skills
  ├── For each skill:
  │   ├── Read SKILL.md content
  │   ├── Apply feature flags if specified (filter sections)
  │   ├── Count tokens using tiktoken/cl100k_base encoding
  │   ├── Break down by section (headings)
  │   └── Record per-skill metrics
  ├── If --include-deps:
  │   ├── Resolve skill dependency tree
  │   └── Sum transitive token counts
  ├── Redundancy analysis:
  │   ├── Compute content similarity between all skill pairs
  │   ├── Use n-gram overlap or embedding similarity
  │   └── Flag pairs with > 20% content overlap
  ├── Cost estimation:
  │   ├── Calculate per-1K-calls cost at current model pricing
  │   └── Support multiple model price points
  └── Report generation
```

## Token Counting

Use `tiktoken` (or a JS port) with the `cl100k_base` encoding (used by GPT-4 and Claude-family models). While exact token counts vary slightly between model families, cl100k_base is a reasonable approximation.

```typescript
import { encoding_for_model } from 'tiktoken';

function countTokens(text: string): number {
  const enc = encoding_for_model('gpt-4');
  const tokens = enc.encode(text);
  enc.free();
  return tokens.length;
}
```

For more precise counts, support a `--model` flag that uses the appropriate tokenizer.

## Redundancy Detection

Two approaches, from simple to sophisticated:

### N-gram Overlap (Fast, Good Enough)
- Tokenize each skill into 4-grams (sequences of 4 tokens)
- Compute Jaccard similarity between all skill pairs
- Flag pairs with > 0.2 similarity

### Semantic Similarity (More Accurate, Slower)
- Generate embeddings for each paragraph in each skill
- Compare embeddings between skills
- Identify specific sections that are semantically equivalent
- Suggest which skill should "own" the shared content

Start with n-gram overlap; add semantic similarity as an option.

## Key Considerations

### Feature Flag Integration
If a skill declares feature flags, the budget tool should report:
- Full cost (all features activated)
- Default cost (default features only)
- Per-feature marginal cost (how many tokens does each feature add?)

This gives skill authors actionable data: "Your i18n feature adds 1,200 tokens. Is that justified?"

### Pricing Model
Maintain a simple pricing table that can be updated:

```json
{
  "claude-opus": { "input": 15.0, "output": 75.0 },
  "claude-sonnet": { "input": 3.0, "output": 15.0 },
  "claude-haiku": { "input": 0.25, "output": 1.25 },
  "gpt-4o": { "input": 2.5, "output": 10.0 }
}
```

Report cost as "per 1,000 skill loads" at the relevant model price point.

### CI Integration
- `--max-tokens N` flag that exits with code 1 if the total exceeds N
- Use in CI to prevent skills from growing unbounded
- Track budget over time as a metric (like tracking bundle size)

### Comparison Mode
Store budget snapshots and compare:
```bash
npx skills-check budget --save baseline.json
# ... make changes ...
npx skills-check budget --compare baseline.json
```

Output:
```
Budget Comparison (baseline → current)
  ai-sdk-core:     2,340 → 2,890 (+550 tokens, +23.5%)
  nextjs-patterns:  4,890 → 4,200 (-690 tokens, -14.1%)  ✓ Improved
  Total:           18,010 → 18,100 (+90 tokens, +0.5%)
```

## File Structure

```
src/
  commands/
    budget.ts               # CLI command handler
  budget/
    index.ts                # Orchestrator
    tokenizer.ts            # Token counting (tiktoken wrapper)
    analyzer.ts             # Per-skill analysis
    features.ts             # Feature-flag-aware measurement
    redundancy/
      ngram.ts              # N-gram overlap detection
      semantic.ts           # Embedding-based similarity (optional)
    cost.ts                 # Pricing model and estimation
    comparison.ts           # Snapshot comparison
    reporters/
      terminal.ts
      json.ts
      markdown.ts
```

## Dependencies

- `tiktoken` (or `js-tiktoken`) — Token counting
- Existing skills-check infrastructure for skill discovery
- Feature flag parser (from feature flags spec, if implemented)

## Success Criteria

- Token counts within 5% of actual model tokenization
- Redundancy detection identifies overlapping content with < 10% false positive rate
- Budget measurement for 50 skills completes in < 5 seconds
- Comparison mode clearly shows budget impact of skill changes
