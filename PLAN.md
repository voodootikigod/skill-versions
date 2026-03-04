# skillsafe Roadmap — Implementation Plan

## Scope

This plan covers the Phase 1 implementation of three new skillsafe CLI commands, preceded by a shared infrastructure extraction. These are the highest-priority items from `prds/00-prioritization-and-ownership.md`.

| Wave | Issue | Command | PRD |
|------|-------|---------|-----|
| 1 | ss-0dh.6 | (shared infra) | — |
| 2 | ss-0dh.1 | `budget` | `prds/04-context-budget.md` |
| 2 | ss-0dh.2 | `verify` | `prds/05-semver-verification.md` |
| 2 | ss-0dh.3 | `lint` | `prds/10-mandatory-metadata.md` |

## Dependency Graph

```
ss-0dh.6 (shared infra) ──┬──> ss-0dh.1 (budget)
                           ├──> ss-0dh.2 (verify)
                           └──> ss-0dh.3 (lint)

ss-0dh.2 (verify) ──> ss-0dh.5 (test) [future]
```

Wave 1 must merge before Wave 2 begins. Wave 2 issues are fully independent of each other.

## Existing Code Reference

Teams must understand the existing patterns before writing code.

### Entry Point
- `packages/cli/src/index.ts` — Commander.js program, registers all commands

### Skill I/O (already shared)
- `packages/cli/src/skill-io.ts` — `readSkillFile()` returns `{ path, frontmatter, content, raw }` using `gray-matter`

### Audit Pattern (template for all new commands)
```
packages/cli/src/audit/
  types.ts          — AuditFinding, AuditChecker, CheckContext, AuditOptions
  index.ts          — Orchestrator: discover → parse → extract → check → filter → report
  cache.ts          — Disk cache (~/.cache/skillsafe/audit/) with TTL
  ignore.ts         — .skillsafeignore + inline <!-- audit-ignore -->
  extractors/       — packages.ts, commands.ts, urls.ts (run once per file)
  checkers/         — registry.ts, advisory.ts, injection.ts, commands.ts, metadata.ts, urls.ts
  reporters/        — terminal.ts, json.ts, markdown.ts, sarif.ts
```

Key design: extractors run once per file, checkers consume extracted data, findings pass through ignore filtering, reporters format output. **All new commands follow this pattern.**

### Command Registration Pattern
Each command in `src/commands/*.ts` exports an async function that returns an exit code (0/1/2). The `src/index.ts` entry point registers it with Commander.js, wraps in try/catch, and calls `process.exit()`.

### Build System
- npm workspaces monorepo, Turborepo orchestration
- Build order: `packages/schema` → `packages/cli` + `packages/web`
- Build gate: `npm run typecheck && npm run build && npm test`
- Tests: Vitest (no config file, uses defaults), colocated with source

---

## Wave 1: Shared Infrastructure (ss-0dh.6)

**Team 1 — Foundation**

### Goal
Extract skill discovery and section parsing into reusable modules. Currently `discoverSkillFiles()` is embedded in `audit/index.ts` (line 24-57). Move it to a shared location so budget, verify, and lint can import it without depending on the audit module.

### Files to Create

#### `packages/cli/src/shared/discovery.ts`
Extract `discoverSkillFiles()` from `audit/index.ts`:
- Same recursive directory walk logic
- Find all SKILL.md files in a directory tree
- Return sorted array of absolute paths
- Keep the existing behavior exactly (recurse into subdirs, stop at SKILL.md)

#### `packages/cli/src/shared/sections.ts`
New module — parse a skill's markdown content into sections:
```typescript
export interface SkillSection {
  heading: string;      // e.g., "## Error Handling"
  level: number;        // 1-6
  content: string;      // raw markdown under this heading
  startLine: number;
  endLine: number;
}

export function parseSections(content: string): SkillSection[];
```
- Split by markdown heading regex (`/^(#{1,6})\s+(.+)$/m`)
- Include preamble (content before first heading) as a section with heading "" and level 0
- Track line numbers for each section

#### `packages/cli/src/shared/types.ts`
Shared types used across commands:
```typescript
// Re-export SkillFile from skill-io.ts for convenience
export type { SkillFile } from "../skill-io.js";
export type { SkillSection } from "./sections.js";

// Common reporter interface
export interface ReportOptions {
  format?: string;
  output?: string;
}
```

#### `packages/cli/src/shared/index.ts`
Barrel export for all shared modules.

### Files to Modify

#### `packages/cli/src/audit/index.ts`
- Remove `discoverSkillFiles()` function (lines 24-57)
- Import from `../shared/discovery.js` instead
- No behavior change — audit must work identically after this refactor

### Tests

#### `packages/cli/src/shared/discovery.test.ts`
- Test recursive discovery
- Test single SKILL.md file
- Test empty directory
- Test nested directories

#### `packages/cli/src/shared/sections.test.ts`
- Test preamble extraction
- Test h1-h6 heading levels
- Test content between headings
- Test line number tracking
- Test skill with no headings (entire content is preamble)

### Acceptance
- [ ] `discoverSkillFiles` importable from `shared/discovery`
- [ ] `parseSections` correctly splits skill content
- [ ] `npm run typecheck && npm run build && npm test` passes
- [ ] Audit command behavior unchanged (existing tests pass)

---

## Wave 2, Team 1: Budget Command (ss-0dh.1)

### Goal
Implement `skillsafe budget` — measures token cost of installed skills, detects redundancy, estimates API cost. See `prds/04-context-budget.md` for full spec.

### Dependency
Install `js-tiktoken` in `packages/cli`:
```bash
cd packages/cli && npm install js-tiktoken
```

### Files to Create

#### `packages/cli/src/commands/budget.ts`
Commander.js command handler. Options:
- `--skill <name>` — measure a specific skill
- `--detailed` — per-section breakdown
- `--format <type>` — terminal (default), json, markdown
- `--output <path>` — write to file
- `--max-tokens <N>` — budget limit, exit 1 if exceeded
- `--save <path>` — save snapshot for comparison
- `--compare <path>` — compare against saved snapshot
- `--model <name>` — pricing model (default: claude-sonnet)

Returns exit code 0 (within budget) or 1 (exceeded `--max-tokens`).

#### `packages/cli/src/budget/index.ts`
Orchestrator:
1. Discover skills using `shared/discovery`
2. Read each with `readSkillFile()`
3. Parse sections with `shared/sections`
4. Count tokens per section using tokenizer
5. Run redundancy analysis
6. Compute cost estimates
7. Format report

#### `packages/cli/src/budget/tokenizer.ts`
Token counting wrapper:
```typescript
import { encodingForModel } from "js-tiktoken";

let encoder: ReturnType<typeof encodingForModel> | null = null;

function getEncoder() {
  if (!encoder) {
    encoder = encodingForModel("gpt-4o");
  }
  return encoder;
}

export function countTokens(text: string): number {
  return getEncoder().encode(text).length;
}
```
- Use lazy initialization (CLAUDE.md pitfall: module-level constants break test mocks)
- `cl100k_base` encoding via `gpt-4o` model
- Export `resetEncoder()` for tests

#### `packages/cli/src/budget/analyzer.ts`
Per-skill analysis:
```typescript
export interface SkillBudget {
  path: string;
  name: string;
  totalTokens: number;
  sections: SectionBudget[];
}

export interface SectionBudget {
  heading: string;
  tokens: number;
  percentage: number;
}

export function analyzeSkill(file: SkillFile, sections: SkillSection[]): SkillBudget;
```

#### `packages/cli/src/budget/redundancy.ts`
N-gram overlap detection:
```typescript
export interface RedundancyMatch {
  skillA: string;
  skillB: string;
  overlapTokens: number;
  similarity: number;  // Jaccard coefficient
  suggestion: string;
}

export function detectRedundancy(skills: SkillBudget[], threshold?: number): RedundancyMatch[];
```
- Tokenize into 4-grams
- Compute Jaccard similarity for all pairs
- Flag pairs with similarity > 0.2
- Generate suggestion text

#### `packages/cli/src/budget/cost.ts`
Pricing model:
```typescript
export interface PricingModel {
  name: string;
  inputPer1MTok: number;
}

export const PRICING: Record<string, PricingModel>;

export function estimateCost(tokens: number, model: string, callsPer1K?: number): number;
```

#### `packages/cli/src/budget/comparison.ts`
Snapshot comparison:
```typescript
export interface BudgetSnapshot { skills: SkillBudget[]; total: number; timestamp: string; }
export interface BudgetDiff { skill: string; before: number; after: number; delta: number; }

export function compareSnapshots(before: BudgetSnapshot, after: BudgetSnapshot): BudgetDiff[];
```

#### `packages/cli/src/budget/reporters/terminal.ts`
Formatted table output with columns: Skill, Tokens, % of 128K, Est. Cost/1K calls. Plus redundancy warnings.

#### `packages/cli/src/budget/reporters/json.ts`
`JSON.stringify(report, null, 2)` — full budget data.

#### `packages/cli/src/budget/reporters/markdown.ts`
Markdown table for PRs/docs.

### Files to Modify

#### `packages/cli/src/index.ts`
Add `budget` command registration (follow existing pattern from audit).

#### `packages/cli/package.json`
Add `js-tiktoken` to dependencies.

### Tests (colocated)
- `budget/tokenizer.test.ts` — token counting accuracy, encoder reset
- `budget/analyzer.test.ts` — per-skill analysis with fixture skills
- `budget/redundancy.test.ts` — overlapping content detection, threshold
- `budget/cost.test.ts` — pricing calculations
- `budget/comparison.test.ts` — snapshot diffing
- `budget/reporters/terminal.test.ts`, `json.test.ts`, `markdown.test.ts`
- `commands/budget.test.ts` — integration test (mock tokenizer + discovery)

### Acceptance
- [ ] Token counts within 5% of actual model tokenization
- [ ] Redundancy detection finds overlapping content (Jaccard > 0.2)
- [ ] `--max-tokens` exits 1 when exceeded
- [ ] `--save` / `--compare` shows deltas
- [ ] All three reporters produce correct output
- [ ] `npm run typecheck && npm run build && npm test` passes

---

## Wave 2, Team 2: Verify Command (ss-0dh.2)

### Goal
Implement `skillsafe verify` — analyzes content changes between skill versions and validates that version bumps match actual change scope. See `prds/05-semver-verification.md` for full spec.

### Files to Create

#### `packages/cli/src/commands/verify.ts`
Commander.js command handler. Options:
- `--skill <name>` — verify a specific skill
- `--all` — verify all skills against git history
- `--before <path>` — previous version path
- `--after <path>` — current version path
- `--suggest` — auto-suggest the appropriate version bump
- `--format <type>` — terminal (default), json
- `--output <path>` — write to file

Returns exit code 0 (version bump appropriate) or 1 (mismatch detected).

#### `packages/cli/src/verify/index.ts`
Orchestrator:
1. Get previous version (from git or `--before`)
2. Get current version (from file or `--after`)
3. Run structural diff
4. Run heuristic classifier
5. If confidence < 0.8, run LLM classifier (if API key available)
6. Compare assessment against declared bump
7. Format report

#### `packages/cli/src/verify/git.ts`
Get previous version from git history:
```typescript
export async function getPreviousVersion(filePath: string): Promise<string | null>;
```
- Run `git log --oneline -1 -- <path>` to check if file has history
- Run `git show HEAD~1:<path>` to get previous content
- Return null if no history (new file)

#### `packages/cli/src/verify/diff/structural.ts`
Section-level comparison:
```typescript
export interface StructuralDiff {
  sectionsAdded: string[];
  sectionsRemoved: string[];
  sectionsModified: string[];
  codeBlocksAdded: number;
  codeBlocksRemoved: number;
  codeBlocksModified: number;
}

export function structuralDiff(before: string, after: string): StructuralDiff;
```
- Use `shared/sections` to parse both versions
- Compare section headings (added/removed/modified)
- Extract and compare code blocks

#### `packages/cli/src/verify/diff/packages.ts`
Package reference comparison:
```typescript
export interface PackageDiff {
  added: string[];
  removed: string[];
  renamed: Array<{ from: string; to: string }>;
}

export function packageDiff(before: string, after: string): PackageDiff;
```
- Reuse `audit/extractors/packages.ts` to extract from both versions
- Detect renames via similarity matching

#### `packages/cli/src/verify/diff/content.ts`
Text similarity:
```typescript
export function contentSimilarity(before: string, after: string): number;
```
- Simple word-level Jaccard similarity (0.0 to 1.0)
- Used by heuristics: >0.95 similarity suggests patch-level changes

#### `packages/cli/src/verify/classifier/heuristics.ts`
Rule-based classification:
```typescript
export interface ChangeSignal {
  type: "major" | "minor" | "patch";
  reason: string;
  confidence: number;
}

export function classifyHeuristic(
  structural: StructuralDiff,
  packages: PackageDiff,
  similarity: number,
): ChangeSignal[];
```
Rules:
- Package removed/renamed → major (0.9)
- `deprecated|removed|no longer` in diff → major (0.7)
- Sections added → minor (0.8)
- Code blocks increased → minor (0.6)
- Only version numbers changed → patch (0.8)
- Similarity > 0.95 → patch (0.7)

#### `packages/cli/src/verify/classifier/llm.ts`
LLM-assisted classification (optional):
```typescript
export async function classifyWithLLM(
  before: string,
  after: string,
): Promise<ChangeSignal | null>;
```
- Uses existing `src/llm/` infrastructure
- Returns null if no API key configured (graceful degradation)
- Prompt: compare two versions, classify as MAJOR/MINOR/PATCH with reasoning

#### `packages/cli/src/verify/classifier/combined.ts`
Combine heuristic + LLM results:
```typescript
export type VersionBump = "major" | "minor" | "patch";

export interface VerifyResult {
  declaredBump: VersionBump;
  assessedBump: VersionBump;
  match: boolean;
  signals: ChangeSignal[];
  explanation: string;
}

export function combineClassification(
  heuristic: ChangeSignal[],
  llm: ChangeSignal | null,
  declaredBump: VersionBump,
): VerifyResult;
```

#### `packages/cli/src/verify/reporters/terminal.ts`
Formatted output showing declared vs assessed bump, signals, and pass/fail.

#### `packages/cli/src/verify/reporters/json.ts`
Full verification result as JSON.

### Files to Modify

#### `packages/cli/src/index.ts`
Add `verify` command registration.

### Tests (colocated)
- `verify/git.test.ts` — mock git commands, test history extraction
- `verify/diff/structural.test.ts` — section add/remove/modify detection
- `verify/diff/packages.test.ts` — package diff with renames
- `verify/diff/content.test.ts` — similarity calculation
- `verify/classifier/heuristics.test.ts` — each rule with fixture diffs
- `verify/classifier/combined.test.ts` — heuristic+LLM combination
- `verify/reporters/terminal.test.ts`, `json.test.ts`
- `commands/verify.test.ts` — integration (mock git + LLM)

### Acceptance
- [ ] Package renames classified as major
- [ ] New sections classified as minor
- [ ] Typo-only fixes classified as patch
- [ ] Heuristic mode runs in <2 seconds per skill
- [ ] Works without LLM API key (heuristics-only fallback)
- [ ] Reuses audit extractors for package extraction
- [ ] `npm run typecheck && npm run build && npm test` passes

---

## Wave 2, Team 3: Lint Command (ss-0dh.3)

### Goal
Implement `skillsafe lint` — validates metadata completeness with deeper checks than audit's metadata checker, plus auto-fix. See `prds/10-mandatory-metadata.md` for full spec.

### Files to Create

#### `packages/cli/src/commands/lint.ts`
Commander.js command handler. Options:
- `--fix` — auto-fix missing fields from git context
- `--ci` — strict exit codes
- `--fail-on <level>` — error (default) or warning
- `--format <type>` — terminal (default), json
- `--output <path>` — write to file

Returns exit code 0 (clean) or 1 (errors found at/above `--fail-on` level).

#### `packages/cli/src/lint/index.ts`
Orchestrator:
1. Discover skills using `shared/discovery`
2. Read each with `readSkillFile()`
3. Run all rule sets (required, conditional, recommended, format)
4. If `--fix`, run autofix
5. Format report

```typescript
export interface LintFinding {
  file: string;
  field: string;
  level: "error" | "warning" | "info";
  message: string;
  fixable: boolean;
}

export interface LintReport {
  files: number;
  findings: LintFinding[];
  errors: number;
  warnings: number;
  fixed: number;
  generatedAt: string;
}

export async function runLint(paths: string[], options: LintOptions): Promise<LintReport>;
```

#### `packages/cli/src/lint/rules/required.ts`
Always-required fields:
```typescript
export function checkRequired(file: SkillFile): LintFinding[];
```
- `name` — string, max 100 chars
- `description` — string, 20-500 chars

#### `packages/cli/src/lint/rules/publish.ts`
Required for publish (error level):
```typescript
export function checkPublishReady(file: SkillFile): LintFinding[];
```
- `author` — string, non-empty
- `license` — valid SPDX identifier
- `repository` — valid URL

#### `packages/cli/src/lint/rules/conditional.ts`
Conditionally required:
```typescript
export function checkConditional(file: SkillFile): LintFinding[];
```
- `product-version` — required if content references a versioned product
- `agents` — required if content has agent-specific instructions

Uses detection heuristics from `lint/detection/`.

#### `packages/cli/src/lint/rules/recommended.ts`
Recommended fields (warning level):
```typescript
export function checkRecommended(file: SkillFile): LintFinding[];
```
- `spec-version` — string
- `keywords` — array with at least 1 item

#### `packages/cli/src/lint/rules/format.ts`
Field format validation:
```typescript
export function checkFormats(file: SkillFile): LintFinding[];
```
- `product-version` must be valid semver
- `repository` must be valid URL
- `license` must be valid SPDX identifier
- `name` must not contain special characters

#### `packages/cli/src/lint/detection/product-refs.ts`
Detect product references in skill content:
```typescript
export function detectsProduct(content: string): boolean;
```
- Matches patterns: "Product Name X.Y", `npm install <pkg>`, `pip install <pkg>`
- Uses audit extractors to find package references
- If packages found, the skill references a product

#### `packages/cli/src/lint/detection/agent-specific.ts`
Detect agent-specific instructions:
```typescript
export function detectsAgentSpecific(content: string): boolean;
```
- Matches: "In Claude Code", "In Cursor", "For Codex", agent-specific CLI commands

#### `packages/cli/src/lint/autofix.ts`
Auto-fix missing fields:
```typescript
export async function autofix(file: SkillFile, findings: LintFinding[]): Promise<string | null>;
```
- `author` → `git config user.name`
- `repository` → `git remote get-url origin`
- `license` → insert `"MIT"` with TODO comment
- Returns new file content or null if nothing to fix
- Uses `gray-matter` to stringify updated frontmatter

#### `packages/cli/src/lint/spdx.ts`
SPDX license validation:
```typescript
export function isValidSpdx(license: string): boolean;
```
- Check against list of common SPDX identifiers (MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, GPL-2.0, GPL-3.0, MPL-2.0, LGPL-2.1, LGPL-3.0, Unlicense, CC0-1.0)
- Support SPDX expressions with OR/AND

#### `packages/cli/src/lint/reporters/terminal.ts`
Per-file output with error/warning/info icons, field names, and messages.

#### `packages/cli/src/lint/reporters/json.ts`
Full lint report as JSON.

### Files to Modify

#### `packages/cli/src/index.ts`
Add `lint` command registration.

### Tests (colocated)
- `lint/rules/required.test.ts` — missing name, missing description, length limits
- `lint/rules/publish.test.ts` — missing author, license, repository
- `lint/rules/conditional.test.ts` — product-version detection, agent detection
- `lint/rules/recommended.test.ts` — missing spec-version, keywords
- `lint/rules/format.test.ts` — invalid semver, invalid URL, invalid SPDX
- `lint/detection/product-refs.test.ts` — heuristic accuracy
- `lint/detection/agent-specific.test.ts` — agent mention detection
- `lint/autofix.test.ts` — mock git, test frontmatter insertion
- `lint/spdx.test.ts` — valid/invalid license strings
- `lint/reporters/terminal.test.ts`, `json.test.ts`
- `commands/lint.test.ts` — integration test (mock discovery + git)

### Acceptance
- [ ] Catches missing required fields (name, description)
- [ ] Catches missing publish fields (author, license, repository)
- [ ] Detects product references and flags missing product-version
- [ ] SPDX validation works for standard identifiers and expressions
- [ ] `--fix` populates author and repository from git context
- [ ] `--ci --fail-on error` exits 1 on errors
- [ ] `npm run typecheck && npm run build && npm test` passes

---

## Wave 3, Team 1: Policy Command (ss-0dh.4)

### Goal
Implement `skillsafe policy` — enforces organizational rules about which skills are allowed, required, or banned. This is `cargo deny` adapted for skills. See `prds/07-policy-enforcement.md` for full spec.

### Files to Create

#### `packages/cli/src/commands/policy.ts`
Commander.js command handler with subcommands:
- `policy check` — check all installed skills against policy
  - `--policy <path>` — path to `.skill-policy.yml` (default: auto-discover)
  - `--skill <name>` — check a specific skill
  - `--ci` — strict exit codes
  - `--format <type>` — terminal (default), json
  - `--output <path>` — write to file
  - `--fail-on <severity>` — blocked (default), violation, warning
- `policy init` — generate a starter `.skill-policy.yml`
- `policy validate` — validate policy file syntax

Returns exit code 0 (compliant), 1 (violations found at/above `--fail-on` level), 2 (error).

#### `packages/cli/src/policy/types.ts`
```typescript
export interface SkillPolicy {
  version: number;
  sources?: { allow?: string[]; deny?: string[] };
  required?: Array<{ source?: string; skill: string }>;
  banned?: Array<{ skill: string; reason?: string }>;
  metadata?: {
    required_fields?: string[];
    require_license?: boolean;
    allowed_licenses?: string[];
  };
  content?: {
    deny_patterns?: Array<{ pattern: string; reason: string }>;
    require_patterns?: Array<{ pattern: string; reason: string }>;
  };
  freshness?: {
    max_age_days?: number;
    max_version_drift?: "major" | "minor" | "patch";
    require_product_version?: boolean;
  };
  audit?: {
    require_clean?: boolean;
    min_severity_to_block?: "critical" | "high" | "medium" | "low";
  };
}

export type PolicySeverity = "blocked" | "violation" | "warning";

export interface PolicyFinding {
  file: string;
  severity: PolicySeverity;
  rule: string;
  message: string;
  detail?: string;
}

export interface PolicyReport {
  policyFile: string;
  files: number;
  findings: PolicyFinding[];
  required: Array<{ skill: string; satisfied: boolean }>;
  summary: { blocked: number; violations: number; warnings: number };
  generatedAt: string;
}

export interface PolicyOptions {
  policy?: string;
  skill?: string;
  ci?: boolean;
  format?: "terminal" | "json";
  output?: string;
  failOn?: PolicySeverity;
}
```

#### `packages/cli/src/policy/parser.ts`
Parse and validate `.skill-policy.yml`:
```typescript
export function parsePolicy(content: string): SkillPolicy;
export function validatePolicy(policy: SkillPolicy): string[];  // returns validation errors
export function discoverPolicyFile(startDir: string): string | null;  // walk up to find .skill-policy.yml
```
- Uses `js-yaml` (already a transitive dep via `gray-matter`)
- Validates version field
- Validates regex patterns compile
- Returns helpful error messages for invalid config

#### `packages/cli/src/policy/index.ts`
Orchestrator:
1. Discover or load policy file
2. Discover skills using `shared/discovery`
3. Read each with `readSkillFile()`
4. Run all validators
5. Check required skills satisfaction
6. If `audit.require_clean`, run audit integration
7. Format report

```typescript
export async function runPolicyCheck(
  paths: string[],
  policy: SkillPolicy,
  options: PolicyOptions,
): Promise<PolicyReport>;
```

#### `packages/cli/src/policy/validators/sources.ts`
Source allow/deny checking:
```typescript
export function checkSources(file: SkillFile, policy: SkillPolicy): PolicyFinding[];
```
- Match skill source (from frontmatter `source` or `repository` field) against allow/deny glob patterns
- If `allow` is specified, everything not matching is implicitly denied
- `deny` takes precedence over `allow`
- Glob matching: `*` matches within segments, `our-org/*` matches `our-org/anything`

#### `packages/cli/src/policy/validators/required.ts`
Required skills verification:
```typescript
export function checkRequired(
  discoveredSkills: SkillFile[],
  policy: SkillPolicy,
): Array<{ skill: string; satisfied: boolean }>;
```
- Match by skill `name` frontmatter field
- Support source matching if specified in policy

#### `packages/cli/src/policy/validators/banned.ts`
Banned skills checking:
```typescript
export function checkBanned(file: SkillFile, policy: SkillPolicy): PolicyFinding[];
```
- Match by skill name (glob patterns)
- Include the `reason` from policy in the finding

#### `packages/cli/src/policy/validators/metadata.ts`
Metadata requirements:
```typescript
export function checkMetadata(file: SkillFile, policy: SkillPolicy): PolicyFinding[];
```
- Check `required_fields` exist in frontmatter
- If `require_license`, verify license field exists
- If `allowed_licenses`, validate license is in the list
- Reuse `lint/spdx.ts` for SPDX validation

#### `packages/cli/src/policy/validators/content.ts`
Content pattern matching:
```typescript
export function checkContent(file: SkillFile, policy: SkillPolicy): PolicyFinding[];
```
- `deny_patterns`: find matches and flag with reason
- `require_patterns`: find absences and flag with reason
- Return line numbers where patterns match

#### `packages/cli/src/policy/validators/freshness.ts`
Staleness policy:
```typescript
export function checkFreshness(file: SkillFile, policy: SkillPolicy): PolicyFinding[];
```
- Check `max_age_days` against frontmatter `last-verified` or file mtime
- Check `max_version_drift` against current product version (if available from registry)
- Check `require_product_version` if product references detected (reuse lint detection)

#### `packages/cli/src/policy/validators/audit-integration.ts`
Audit integration:
```typescript
export async function checkAuditClean(
  paths: string[],
  policy: SkillPolicy,
): Promise<PolicyFinding[]>;
```
- If `audit.require_clean` is true, run `runAudit()` from `../audit/index.js`
- Convert audit findings at/above `min_severity_to_block` to policy violations
- This is a cross-command integration — import and call the audit orchestrator

#### `packages/cli/src/policy/init.ts`
Generate starter policy:
```typescript
export function generateStarterPolicy(): string;
```
- YAML template with commented examples
- Includes common defaults (MIT/Apache-2.0 licenses, required fields)

#### `packages/cli/src/policy/reporters/terminal.ts`
Formatted output matching PRD sample:
- BLOCKED section (red)
- VIOLATIONS section (yellow)
- WARNINGS section (dim yellow)
- REQUIRED satisfaction (green checks / red X)
- Summary line with pass/fail

#### `packages/cli/src/policy/reporters/json.ts`
Full PolicyReport as JSON.

### Files to Modify

#### `packages/cli/src/index.ts`
Add `policy` command registration with `check`, `init`, `validate` subcommands.

### Tests (colocated)
- `policy/parser.test.ts` — valid/invalid YAML, version validation, regex compilation
- `policy/validators/sources.test.ts` — allow/deny glob matching, implicit deny
- `policy/validators/required.test.ts` — skill presence/absence
- `policy/validators/banned.test.ts` — name matching, reason propagation
- `policy/validators/metadata.test.ts` — field requirements, license validation
- `policy/validators/content.test.ts` — deny/require pattern matching with line numbers
- `policy/validators/freshness.test.ts` — age, drift, product-version requirement
- `policy/validators/audit-integration.test.ts` — mock runAudit, severity mapping
- `policy/init.test.ts` — starter template validity
- `policy/reporters/terminal.test.ts`, `json.test.ts`
- `commands/policy.test.ts` — integration test (mock discovery + all validators)

### Acceptance
- [ ] Source allow/deny correctly gates skills
- [ ] Content deny patterns with < 5% false positive rate
- [ ] Policy init generates valid, usable template
- [ ] Audit integration runs when configured
- [ ] `--ci` exits 1 on violations at or above threshold
- [ ] Policy file discovery walks up directories
- [ ] `npm run typecheck && npm run build && npm test` passes

---

## Wave 3, Team 2: Test Command (ss-0dh.5)

### Goal
Implement `skillsafe test` — runs eval test suites declared in a skill's `tests/` directory against an agent harness. See `prds/03-skill-testing.md` for full spec.

### Key Design Decisions
- **Agent harness abstraction**: AgentHarness interface with implementations for Claude Code (`claude exec`), generic shell, and a mock harness for testing the test runner itself
- **LLM rubric grading**: Uses existing `src/llm/providers.ts` infrastructure with `generateObject()` from Vercel AI SDK, following the pattern in `verify/classifier/llm.ts`
- **Graceful degradation**: LLM-graded tests skip with a warning when no API key is available; code-based graders always work
- **Cost management**: `--dry` mode for estimation, budget cap with `--max-cost`

### Files to Create

#### `packages/cli/src/commands/test.ts`
Commander.js command handler. Options:
- `--skill <name>` — test a specific skill
- `--type <type>` — filter by test type: trigger, outcome, style, regression
- `--agent <name>` — agent harness to use: claude-code, generic (default: generic)
- `--agent-cmd <command>` — custom agent command for generic harness
- `--format <type>` — terminal (default), json, markdown
- `--output <path>` — write to file
- `--trials <N>` — runs per case (default: 3)
- `--pass-threshold <N>` — trials that must pass (default: 2)
- `--timeout <seconds>` — per-case timeout (default: 120)
- `--max-cost <dollars>` — budget cap
- `--dry` — show what would be tested without executing
- `--update-baseline` — accept current results as new baseline
- `--ci` — strict exit codes
- `--provider <name>` — LLM provider for rubric grading
- `--model <id>` — model for rubric grading
- `--verbose` — show per-grader results

Returns exit code 0 (all passed), 1 (failures), 2 (error).

#### `packages/cli/src/testing/types.ts`
```typescript
export interface TestSuite {
  name: string;
  productVersion?: string;
  timeout: number;
  trials: number;
  cases: TestCase[];
}

export interface TestCase {
  id: string;
  type: "trigger" | "outcome" | "style" | "regression";
  prompt: string;
  expectTrigger?: boolean;
  fixture?: string;
  graders: GraderConfig[];
}

export type GraderConfig =
  | { type: "file-exists"; paths: string[] }
  | { type: "command"; run: string; expect_exit: number }
  | { type: "contains"; file: string; patterns: string[] }
  | { type: "not-contains"; file: string; patterns: string[] }
  | { type: "json-match"; file: string; schema: Record<string, unknown> }
  | { type: "package-has"; dependencies?: string[]; devDependencies?: string[] }
  | { type: "llm-rubric"; rubric?: string; criteria: string[] }
  | { type: "custom"; module: string };

export interface GraderResult {
  grader: string;
  passed: boolean;
  message: string;
  detail?: string;
}

export interface TrialResult {
  trial: number;
  graderResults: GraderResult[];
  passed: boolean;
  duration: number;
  error?: string;
}

export interface CaseResult {
  caseId: string;
  type: TestCase["type"];
  prompt: string;
  trials: TrialResult[];
  passed: boolean;
  passRate: number;
  flaky: boolean;
}

export interface TestReport {
  skillName: string;
  skillPath: string;
  suite: string;
  cases: CaseResult[];
  passed: number;
  failed: number;
  skipped: number;
  totalDuration: number;
  generatedAt: string;
}

export interface AgentExecution {
  exitCode: number;
  transcript: string;
  filesCreated: string[];
  duration: number;
  tokenUsage?: { input: number; output: number };
}

export interface TestOptions {
  skill?: string;
  type?: string;
  agent?: string;
  agentCmd?: string;
  format?: "terminal" | "json" | "markdown";
  output?: string;
  trials?: number;
  passThreshold?: number;
  timeout?: number;
  maxCost?: number;
  dry?: boolean;
  updateBaseline?: boolean;
  ci?: boolean;
  provider?: string;
  model?: string;
  verbose?: boolean;
}
```

#### `packages/cli/src/testing/discovery.ts`
Find skills with `tests/` directories:
```typescript
export async function discoverTestableSkills(dir: string, skillFilter?: string): Promise<Array<{
  skillPath: string;
  skillFile: SkillFile;
  testsDir: string;
  casesPath: string;
}>>;
```
- Uses `shared/discovery` to find SKILL.md files
- Checks for sibling `tests/cases.yaml` (or `cases.yml`)
- Returns only skills that have test suites

#### `packages/cli/src/testing/parser.ts`
Parse and validate `cases.yaml`:
```typescript
export function parseTestSuite(content: string): TestSuite;
export function validateTestSuite(suite: TestSuite): string[];
```
- Uses `js-yaml` for parsing
- Validates required fields: suite.name, case.id, case.type, case.prompt
- Validates grader configs are well-formed
- Returns helpful error messages

#### `packages/cli/src/testing/index.ts`
Orchestrator:
```typescript
export async function runTests(dir: string, options: TestOptions): Promise<TestReport[]>;
```
1. Discover testable skills
2. Parse cases.yaml for each
3. If `--dry`, show test plan and return
4. For each case:
   a. Set up fixture directory (copy to temp)
   b. Execute prompt via agent harness
   c. Run all graders against results
   d. Repeat for N trials
   e. Aggregate: pass if >= threshold trials pass
5. Compare against baseline if exists
6. If `--update-baseline`, save results
7. Format report

#### `packages/cli/src/testing/harness/interface.ts`
Agent harness interface:
```typescript
export interface AgentHarness {
  name: string;
  available(): Promise<boolean>;
  execute(prompt: string, options: {
    workDir: string;
    timeout: number;
    skills?: string[];
  }): Promise<AgentExecution>;
}
```

#### `packages/cli/src/testing/harness/claude-code.ts`
Claude Code harness:
```typescript
export class ClaudeCodeHarness implements AgentHarness { ... }
```
- Uses `child_process.execFile` to run `claude` CLI
- Command: `claude --print --dangerously-skip-permissions "${prompt}"`
- Captures stdout as transcript
- Detects files created by diffing workDir before/after
- Timeout via `AbortSignal.timeout()`

#### `packages/cli/src/testing/harness/generic.ts`
Generic shell harness:
```typescript
export class GenericHarness implements AgentHarness { ... }
```
- Configurable command template (e.g., `codex exec --full-auto "{prompt}"`)
- Falls back to a simple shell execution
- Used as the default harness

#### `packages/cli/src/testing/harness/mock.ts`
Mock harness for testing the test runner itself:
```typescript
export class MockHarness implements AgentHarness { ... }
```
- Returns preconfigured responses
- Used exclusively in unit tests

#### `packages/cli/src/testing/graders/file-exists.ts`
```typescript
export function gradeFileExists(workDir: string, paths: string[]): GraderResult;
```
- Check each path exists relative to workDir

#### `packages/cli/src/testing/graders/command.ts`
```typescript
export async function gradeCommand(workDir: string, run: string, expectExit: number): Promise<GraderResult>;
```
- Run shell command in workDir
- Compare exit code

#### `packages/cli/src/testing/graders/contains.ts`
```typescript
export function gradeContains(workDir: string, file: string, patterns: string[], negate?: boolean): GraderResult;
```
- Read file, match each regex pattern
- `negate` for not-contains

#### `packages/cli/src/testing/graders/json-match.ts`
```typescript
export function gradeJsonMatch(workDir: string, file: string, schema: Record<string, unknown>): GraderResult;
```
- Parse JSON file, validate structure

#### `packages/cli/src/testing/graders/package-has.ts`
```typescript
export function gradePackageHas(workDir: string, deps?: string[], devDeps?: string[]): GraderResult;
```
- Read package.json, check dependencies/devDependencies

#### `packages/cli/src/testing/graders/llm-rubric.ts`
LLM-based rubric grading (follows `verify/classifier/llm.ts` pattern):
```typescript
export async function gradeLlmRubric(
  workDir: string,
  criteria: string[],
  rubricPath?: string,
  prompt?: string,
  providerFlag?: string,
  modelFlag?: string,
): Promise<GraderResult>;
```
- Dynamic imports for `resolveModel`, `generateObject`, `zod`
- Read rubric markdown file, inject template variables ({{prompt}}, {{file_list}})
- Ask LLM to evaluate each criterion as PASS/FAIL with explanation
- Returns null (graceful degradation) if no LLM provider available
- Zod schema for structured output:
  ```typescript
  z.object({
    criteria: z.array(z.object({
      criterion: z.string(),
      passed: z.boolean(),
      explanation: z.string(),
    })),
  })
  ```

#### `packages/cli/src/testing/graders/custom.ts`
Custom grader loader:
```typescript
export async function gradeCustom(workDir: string, modulePath: string): Promise<GraderResult>;
```
- Dynamic import of the module
- Call exported `grade()` function
- Wrap in try/catch for graceful failure

#### `packages/cli/src/testing/runner.ts`
Trial execution:
```typescript
export async function runCase(
  testCase: TestCase,
  harness: AgentHarness,
  options: { workDir: string; timeout: number; trials: number; passThreshold: number },
): Promise<CaseResult>;
```
- Set up fixture (copy to temp dir)
- Run N trials sequentially
- Grade each trial
- Determine pass/fail based on threshold
- Flag as flaky if inconsistent

#### `packages/cli/src/testing/baseline.ts`
Baseline storage and comparison:
```typescript
export function loadBaseline(skillPath: string): TestReport | null;
export function saveBaseline(skillPath: string, report: TestReport): void;
export function compareBaseline(current: TestReport, baseline: TestReport): BaselineDiff;
```
- Storage: `.skillsafe/test-baselines/<skill-name>.json`
- Diff: show regressions (was passing, now failing) and improvements

#### `packages/cli/src/testing/cost.ts`
Cost estimation:
```typescript
export function estimateTestCost(suites: TestSuite[], options: TestOptions): CostEstimate;
```
- Trigger tests: near-zero cost
- Outcome tests: estimate based on prompt size × trials × model pricing
- LLM-rubric graders: estimate per evaluation

#### `packages/cli/src/testing/reporters/terminal.ts`
Per-case pass/fail with:
- Test suite name and skill
- Each case: id, type, pass/fail, pass rate (e.g., 2/3)
- Flaky indicator
- Per-grader details in verbose mode
- Summary: N passed, N failed, N skipped

#### `packages/cli/src/testing/reporters/json.ts`
Full TestReport array as JSON.

#### `packages/cli/src/testing/reporters/markdown.ts`
Markdown table with results for PR comments.

### Files to Modify

#### `packages/cli/src/index.ts`
Add `test` command registration.

### Tests (colocated)
- `testing/parser.test.ts` — valid/invalid cases.yaml, grader config validation
- `testing/discovery.test.ts` — find testable skills, filter by name
- `testing/graders/file-exists.test.ts` — existing/missing files
- `testing/graders/command.test.ts` — exit code matching
- `testing/graders/contains.test.ts` — pattern matching, negation
- `testing/graders/json-match.test.ts` — valid/invalid JSON structure
- `testing/graders/package-has.test.ts` — dependency checking
- `testing/graders/llm-rubric.test.ts` — mock LLM, graceful degradation
- `testing/graders/custom.test.ts` — dynamic import, error handling
- `testing/runner.test.ts` — trial execution with mock harness, threshold logic, flaky detection
- `testing/baseline.test.ts` — save/load/compare, regression detection
- `testing/cost.test.ts` — cost estimation
- `testing/harness/claude-code.test.ts` — mock execFile
- `testing/harness/generic.test.ts` — mock shell execution
- `testing/reporters/terminal.test.ts`, `json.test.ts`, `markdown.test.ts`
- `commands/test.test.ts` — integration test (mock harness + graders)

### Acceptance
- [ ] Test discovery finds skills with tests/ directories
- [ ] cases.yaml parsing validates all grader types
- [ ] Code-based graders work without LLM
- [ ] LLM rubric grader degrades gracefully without API key
- [ ] Trial execution respects threshold (e.g., 2/3 must pass)
- [ ] Flaky tests detected and flagged
- [ ] Baseline comparison shows regressions
- [ ] `--dry` shows test plan without execution
- [ ] `--ci` exits 1 on failures
- [ ] `npm run typecheck && npm run build && npm test` passes

---

## Wave 4: GitHub Action + Website (ss-0dh.9, ss-0dh.10)

### Team 1: GitHub Action Updates (ss-0dh.9)
Update `action.yml` to support new commands:
- Add `policy` check to CI workflow
- Add `lint` check to CI workflow
- Support `--ci` flags for all commands
- Update README.md CI integration section

### Team 2: Website Updates (ss-0dh.10)
Update `packages/web` to reflect new capabilities:
- New command reference pages
- Updated feature descriptions
- CLI examples for new commands

---

## Merge Order (Full)

### Waves 1-2 (COMPLETED)
1. ✅ Wave 1: `ss-0dh.6` (shared infra)
2. ✅ Wave 2: `ss-0dh.1` (budget), `ss-0dh.2` (verify), `ss-0dh.3` (lint)

### Wave 3
3. Wave 3: merge in any order (independent):
   - `ss-0dh.4` (policy) — more validators, audit integration
   - `ss-0dh.5` (test) — more complex, agent harness + graders
4. Build gate after each merge: `npm run typecheck && npm run build && npm test`

### Wave 4
5. Wave 4: `ss-0dh.9` (action) and `ss-0dh.10` (web) — after policy merges

## Post-Merge Checklist

After all Wave 3 merges complete:
- [ ] Update `packages/cli/src/index.ts` if any conflicts in command registration
- [ ] Run full test suite from root: `npm test`
- [ ] Run `npm run build` to verify Turbo build order
- [ ] Update README.md CLI Reference section with new commands
- [ ] Update CLAUDE.md commands table (Current vs Planned → mark as shipped)
- [ ] Close beads issues: `bd close ss-0dh.4 ss-0dh.5`
