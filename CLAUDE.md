# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

`skillsafe` is the quality and integrity layer for Agent Skills. It answers: **"Are my skills correct, safe, current, and efficient?"**

Agent Skills are SKILL.md files — markdown documents with YAML frontmatter that instruct AI coding agents (Claude Code, Cursor, Codex, etc.) how to work with specific products, frameworks, and patterns. Skills look like documentation but are treated as executable instructions by agents with file system and shell access. This makes skill quality a security and correctness concern, not just a readability one.

skillsafe sits alongside `skills.sh` (which handles installation, discovery, and distribution) as the complementary verification layer. skills.sh installs them, skillsafe keeps them safe. The skills.sh maintainer is a colleague — skillsafe should **leverage and complement** skills.sh, never duplicate or compete with it. The repo also doubles as a reusable GitHub Action (`voodootikigod/skillsafe@v1`).

### Scope: What skillsafe owns

skillsafe focuses on **analyzing, verifying, and maintaining** skills — not distributing them. Capabilities that belong here answer questions like:

- **Is this skill current?** — Version drift detection, staleness checking (`check`, `refresh`)
- **Is this skill safe?** — Security audit, hallucination detection, prompt injection scanning (`audit`)
- **Is this skill well-formed?** — Metadata validation, structural linting (`lint`)
- **Is this skill efficient?** — Context window token cost analysis (`budget`)
- **Is this skill's version bump honest?** — Content-change-to-version-bump verification (`verify`)
- **Does this skill still work?** — Eval/test integration for regression detection (`test`)
- **Does this skill comply with our policies?** — Organizational trust rules and enforcement (`policy`)

### Scope: What skillsafe does NOT own

These capabilities belong to skills.sh, the Agent Skills spec, or registries. skillsafe should integrate with them, not reimplement them:

- **Distribution & installation** — `npx skills add`, registry, CLI → skills.sh
- **Lockfiles & dependency resolution** — deterministic installs → skills.sh
- **Deprecation & yanking** — lifecycle state management → skills.sh
- **Feature flag loading** — context-aware skill section filtering → skills.sh + spec
- **Dependency groups** — contextual skill loading → skills.sh + spec
- **Template/parameterized skills** — install-time customization → skills.sh
- **Private registries** — enterprise distribution → skills.sh
- **Structured taxonomy/classifiers** — discovery and filtering → skills.sh + spec
- **Spec editions** — spec versioning mechanism → Agent Skills spec

Where skillsafe *reads* data from these systems (e.g., reading a lockfile to verify integrity, checking deprecation status in a health report), that's fine. Where skillsafe would *manage* that data, defer to skills.sh.

### PRDs and Roadmap

Detailed product requirement documents live in `./prds/`. These cover both features skillsafe will build and proposals to bring to skills.sh and the Agent Skills spec:

| PRD | Builds in skillsafe? | Description |
|-----|---------------------|-------------|
| `00-prioritization-and-ownership.md` | — | Master prioritization matrix and ownership map |
| `01-security-audit.md` | ✅ Yes (shipped) | Hallucination detection, prompt injection, dangerous commands |
| `02-feature-flags.md` | ❌ Propose to spec + skills.sh | Optional capabilities within skills for context window economics |
| `03-skill-testing.md` | ✅ Yes (shipped) | Eval test runner with agent harnesses, graders, baseline tracking |
| `04-context-budget.md` | ✅ Yes (shipped) | Token cost analysis, redundancy detection |
| `05-semver-verification.md` | ✅ Yes (shipped) | Content-change-to-version-bump validation |
| `06-lockfiles.md` | ❌ Propose to skills.sh | Deterministic installs; skillsafe can read but not manage |
| `07-policy-enforcement.md` | ✅ Yes (shipped) | Organizational trust rules via `.skill-policy.yml` |
| `08-deprecation-yanking.md` | ❌ Propose to skills.sh | Lifecycle state; skillsafe reports status in `check` output |
| `09-dependency-groups.md` | ❌ Propose to spec + skills.sh | Contextual loading; skillsafe's `budget` can report per-group costs |
| `10-mandatory-metadata.md` | ✅ Yes (shipped) | Local lint with auto-fix; skills.sh enforces on publish |
| `11-template-skills.md` | ❌ Propose to skills.sh | Install-time parameterization |
| `12-spec-editions.md` | ❌ Propose to spec | Spec versioning mechanism |
| `13-structured-taxonomy.md` | ❌ Propose to spec + skills.sh | Classifier vocabulary for discovery |

When implementing features, always check the relevant PRD first. When a PRD is tagged "Propose to skills.sh", the deliverable is a written proposal or PR to the skills.sh repo — not code in this repo.

### Commands

| Command | Status | What It Does |
|---------|--------|-------------|
| `check` | ✅ Shipped | Detect version drift in skills by comparing `product-version` frontmatter against npm registry |
| `report` | ✅ Shipped | Generate a formatted report of check results |
| `refresh` | ✅ Shipped | AI-assisted update of stale skill files using LLMs (Anthropic, OpenAI, Google) |
| `audit` | ✅ Shipped | Security scan: hallucinated packages, prompt injection, dangerous commands, dead URLs, metadata gaps |
| `init` | ✅ Shipped | Initialize a `skillsafe.json` registry file for a project |
| `lint` | ✅ Shipped | Validate metadata completeness, structural quality, and format with auto-fix from git context |
| `budget` | ✅ Shipped | Token cost analysis per skill, redundancy detection between skills, snapshot comparison. Novel — no equivalent in any package ecosystem |
| `verify` | ✅ Shipped | Validate that content changes between skill versions match the declared semver bump (heuristic + LLM-assisted, like cargo semver-checks for knowledge) |
| `test` | ✅ Shipped | Run eval test suites declared in a skill's `tests/` directory against an agent harness. Regression detection after `refresh`. Supports Claude Code and generic harnesses |
| `policy` | ✅ Shipped | Enforce organizational rules: trusted sources, banned patterns, required metadata, staleness limits, audit cleanliness. Policy-as-code via `.skill-policy.yml` |

## Monorepo Structure

npm workspaces monorepo with three packages orchestrated by Turborepo:

| Package | Published As | Purpose |
|---------|-------------|---------|
| `packages/schema` | `@skillsafe/schema` | TypeScript types + generated JSON Schema for the registry format |
| `packages/cli` | `skillsafe` (npm) | CLI tool — 10 commands: `init`, `check`, `report`, `refresh`, `audit`, `budget`, `verify`, `lint`, `policy`, `test` |
| `packages/web` | Private (Vercel) | Next.js 16 marketing/docs site at skillsafe.sh |

**Build order matters**: `schema` must build first (produces `dist/schema.json` and type declarations), then `cli` and `web` consume it. Turbo handles this via `"dependsOn": ["^build"]`.

## Commands

```bash
# Install dependencies (from root)
npm install

# Build all packages (respects dependency order)
npm run build

# Run tests (cli package only, uses Vitest)
npm test

# Run a single test file
cd packages/cli && npx vitest run src/severity.test.ts

# Lint all packages (Biome)
npm run lint

# Auto-fix lint/format issues
npx biome check --write .

# Type check
npm run typecheck

# Run CLI during development
cd packages/cli && npx tsx src/index.ts check
cd packages/cli && npx tsx src/index.ts audit [path]

# Dev server for web
cd packages/web && npm run dev
```

## Code Style (Biome)

- Tab indentation, 100-char line width
- Double quotes, semicolons always
- Auto-organized imports
- Config is in root `biome.json` — no ESLint or Prettier

## Architecture Notes

### CLI (`packages/cli`)

Commander.js entry point in `src/index.ts`. Each command lives in `src/commands/`. LLM-assisted commands (`refresh`, `verify`, `test`) use Vercel AI SDK (`ai` package) with optional provider SDKs (`@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`). LLM logic is isolated in `src/llm/`. All commands follow the extractor/checker/reporter architecture established by `audit`.

### Audit (`packages/cli/src/audit/`)

Integrity and quality audit pipeline with a modular extractor/checker architecture. No new dependencies — uses built-in `fetch` for PyPI/crates.io and existing `fetchLatestVersion()` for npm.

**Important context:** skills.sh now integrates Snyk, Socket, and Gen as independent security auditors at submission and install time. Snyk uses LLM-based intent analysis for prompt injection/malware detection and has publicly criticized regex-based scanners as insufficient. skillsafe's unique audit value is in areas these scanners don't cover: **hallucinated package detection** (do referenced packages exist?), **URL liveness** (did links rot?), and **metadata completeness** (can other skillsafe commands function?). The regex-based injection and command checkers (`injection.ts`, `commands.ts`) are useful as fast local checks during development but should not be positioned as comprehensive security scanning. See `./prds/01-security-audit.md` for the full landscape analysis and v2 evolution plan.

```
audit/
  types.ts                         # AuditFinding, AuditReport, CheckContext, AuditChecker, AuditOptions
  index.ts                         # Orchestrator: discover → parse → extract → check → filter → aggregate
  cache.ts                         # Persistent disk cache (~/.cache/skillsafe/audit/) with 1-hour TTL
  ignore.ts                        # .skillsafeignore parsing + inline <!-- audit-ignore --> support
  extractors/
    packages.ts                    # npm/pip/cargo package references with line numbers
    commands.ts                    # Shell commands from fenced code blocks (bash/sh/shell/zsh/console)
    urls.ts                        # Markdown links + bare URLs, deduplicated
  checkers/
    registry.ts                    # Verify packages exist on npm/PyPI/crates.io (concurrency limit: 5)
    advisory.ts                    # Known hallucinated packages (Aikido Security, Socket.dev research)
    injection.ts                   # Prompt injection: override instructions, exfiltration, obfuscation
    commands.ts                    # Dangerous commands: destructive, pipe-to-shell, sensitive access
    metadata.ts                    # Frontmatter completeness (required: name, description, product-version)
    urls.ts                        # URL liveness via HEAD requests (10s timeout)
  reporters/
    terminal.ts                    # Chalk-colored, grouped by file, severity icons
    json.ts                        # JSON.stringify(report, null, 2)
    markdown.ts                    # Summary table + severity sections
    sarif.ts                       # SARIF 2.1.0 for GitHub Security tab
```

Key design: extractors run once per file, checkers consume extracted data. Findings pass through `.skillsafeignore` + inline comment filtering. Registry lookups use layered caching (in-memory Map + disk with TTL).

**This extractor/checker/reporter pattern is the template used by all commands.** Each command follows the same architecture: parse SKILL.md → extract relevant data → run checks → filter → report. Extractors and reporters are reused across commands where possible.

### Shared Infrastructure (`packages/cli/src/shared/`)

Reusable modules extracted from `audit/` and used by all commands:

- `discovery.ts` — `discoverSkillFiles()` recursive directory walker for SKILL.md files
- `sections.ts` — `parseSections(content)` splits markdown into `SkillSection[]` with headings, levels, line numbers
- `types.ts` — Shared types and re-exports

### Budget (`packages/cli/src/budget/`)

Token cost analysis using `js-tiktoken` with `cl100k_base` encoding. Per-skill and per-section token counts, inter-skill redundancy detection via 4-gram Jaccard similarity, cost estimation across model pricing tiers, and snapshot comparison for tracking budget changes over time.

### Verify (`packages/cli/src/verify/`)

Semver verification using a two-layer classifier: heuristic rules (section diffs, package changes, content similarity) produce confidence-scored signals, then LLM-assisted classification via `generateObject()` refines uncertain cases. Reuses audit extractors for package comparison. Git integration for retrieving previous file versions.

### Lint (`packages/cli/src/lint/`)

Metadata validation with four rule sets: required fields (name, description), publish-ready fields (author, license, repository), conditional fields (product-version when products referenced, agents when agent-specific content), and format validation (semver, SPDX, URLs). Auto-fix populates missing fields from git context. SPDX validation covers 100+ identifiers with OR/AND expressions.

### Policy (`packages/cli/src/policy/`)

Policy-as-code enforcement via `.skill-policy.yml`. Seven validators: source allow/deny with glob matching, required skills verification, banned skills, metadata requirements (reuses lint's SPDX validation), content deny/require patterns with line numbers, freshness/staleness limits, and audit integration (cross-command: runs `runAudit()` when `audit.require_clean` is configured). Policy file discovery walks up directories for monorepo support.

### Testing (`packages/cli/src/testing/`)

Eval test runner with `cases.yaml` declarative test suites. Agent harness abstraction with Claude Code and generic shell implementations. Seven built-in graders: file-exists, command (exit code), contains/not-contains (regex), json-match, package-has, llm-rubric (via Vercel AI SDK with graceful degradation), and custom (dynamic module import). Trial-based execution with configurable pass threshold and flaky test detection. Baseline storage for regression tracking.

### Schema (`packages/schema`)

Pure types in `src/types.ts`. The `build` script runs `tsup` then `tsx src/generate.ts` to produce a JSON Schema artifact (`dist/schema.json`) from TypeScript types via `ts-json-schema-generator`.

### Web (`packages/web`)

Next.js App Router with CSS Modules. The `prebuild` script copies `schema/dist/schema.json` into `public/` so it's served at `/schema.json`. Components are in `components/` with colocated `.module.css` files.

### Registry file (`skillsafe.json`)

Maps product names to npm packages, tracks verified versions, and lists associated skill/agent files. Validated by `src/registry.ts`.

## Architectural Principles

These principles govern all commands in the codebase:

1. **No unnecessary new dependencies.** The audit command was built with zero new deps — use built-in `fetch`, existing utilities, and the Vercel AI SDK (already installed) for any LLM-assisted features. Only add a dependency if there's no reasonable alternative.

2. **Extractor/checker separation.** Extract data from SKILL.md once (parsing, regex extraction, frontmatter reading), then pass extracted data to multiple independent checkers. This avoids redundant parsing and makes checkers testable in isolation.

3. **Layered caching.** Network-dependent operations (registry lookups, URL checks) should use the existing cache infrastructure in `src/audit/cache.ts` — in-memory Map for deduplication within a run, persistent disk cache with TTL for across runs. Store cache in `~/.cache/skillsafe/`.

4. **Reporter reuse.** Terminal, JSON, Markdown, and SARIF reporters exist. Commands output through the same reporter interface where possible, extending it only for command-specific needs.

5. **Graceful degradation.** Commands work without network access (skipping network-dependent checks with warnings), without LLM API keys (skipping AI-assisted features), and without optional config files (using sensible defaults).

6. **CI-first.** Every command supports `--json` for machine-readable output, `--ci` for strict exit codes (non-zero on findings above threshold), and `--fail-on <severity>` for configurable thresholds.

## Ecosystem Context & Collaboration Model

skillsafe operates within the broader Agent Skills ecosystem. The relationship with skills.sh is collaborative — the maintainer is a colleague. Design decisions should always ask: "Does this belong in skillsafe, or should we propose it to skills.sh?"

- **skills.sh** (Vercel) — The primary registry and CLI for installing skills (`npx skills add`). skillsafe complements but never duplicates its functionality. Distribution, installation, loading, and lifecycle management are skills.sh concerns. When skillsafe needs to understand installed skills (e.g., for `budget` or `policy`), it should read skills.sh's artifacts (installed skill directories, any future lockfile) rather than maintaining a parallel tracking system.
- **Agent Skills Spec** (agentskills.io) — Defines the SKILL.md format. skillsafe validates compliance with this spec. Proposals for spec extensions (feature flags, test conventions, product-version, classifiers) should be tracked as issues in this repo and brought to the spec maintainers as formal proposals.
- **Agent harnesses** — Claude Code, Cursor, Codex, etc. load skills into LLM context. skillsafe's `budget` command measures the token cost of this loading. The `test` command executes prompts through configurable agent harnesses (Claude Code CLI, generic shell).
- **npm registry** — The source of truth for product versions. skillsafe's `check` command queries npm to detect version drift. Future npm-native skill distribution (skillpm, skills-npm) may change how skills are versioned.

### Integration points with skills.sh

Where skillsafe naturally connects to skills.sh (current or future):

- `skillsafe audit` could run as a pre-install hook in skills.sh
- `skillsafe check` results could surface in `npx skills status`
- `skillsafe budget` per-group reports depend on skills.sh's dependency group resolution
- `skillsafe policy` source allow/deny lists reference skills.sh registry sources
- skills.sh deprecation/yank status could feed into `skillsafe check` health reports
- skills.sh lockfile (if implemented) could feed into `skillsafe verify` for precise diffing

## Testing

91 test files with 688 tests in `packages/cli/src/` (colocated with source files). Vitest with no config file — uses defaults. No coverage thresholds configured.

When writing tests, follow the established patterns: mock all network-dependent modules, use fixture SKILL.md files with known content, and test the orchestrator, individual checkers/validators/graders, and reporters independently.

## Deployment

- **CLI**: Published to npm via GitHub Actions on release (`publish.yml`), uses `npm publish --provenance`
- **Web**: Deployed to Vercel at skillsafe.sh
- **GitHub Action**: Defined in root `action.yml`, composite action supporting all 10 commands via `commands` input or individual toggle flags. Backward-compatible — defaults to `check` only. Per-command threshold inputs (e.g., `audit-fail-on`, `budget-max-tokens`). Outputs include `results` JSON with per-command exit codes

## Feature Development Checklist

When adding or updating features, always update **all three surfaces**:

1. **Code** — implement in the appropriate package(s), following extractor/checker/reporter pattern
2. **README.md** — update CLI reference, registry format, examples as needed
3. **CLAUDE.md** — keep architecture notes, commands table, and structure current
4. **Web (`packages/web`)** — update the marketing/docs site to reflect new capabilities
5. **Tests** — colocated with source files, mock all network calls, test checkers independently

## Development Pitfalls

Lessons learned from building features in this codebase:

**Module-level constants break test mocks.** `vi.mock("node:os")` runs after top-level `const X = homedir()` has already evaluated. Use lazy functions instead (`function getX() { return homedir(); }`). Similarly, module-level state (e.g., `let initialized = false`) persists across tests — export a `reset()` function and call it in `beforeEach`.

**Regex groups that share words fail silently.** When writing patterns like `forget (all|your|previous) instructions`, if the input is "forget all your previous instructions", `all` matches the group but `your` and `previous` have no group to match. Make each word independently optional: `(?:all\s+)?(?:your\s+)?(?:previous\s+)?`.

**Fence detection in markdown parsers.** A regex like `/^```(\w+)?$/` matches both opening (` ```bash `) and closing (` ``` `) fences. Don't use `!openingRegex.test(line)` as an end-fence check — it will never match. Use a separate end-fence regex or track state.

**Boundary conditions in TTL checks.** Use `>=` not `>` for expiry: `Date.now() - timestamp >= ttlMs`. With `>`, a TTL of 0 doesn't expire same-millisecond entries.

**Biome formatting after multi-line edits.** Always run `npx biome check --write` on changed files before committing — line-length wrapping rules are hard to predict for template literals and chained method calls.

**Mock all network-dependent modules in integration tests.** For tests that exercise the orchestrator (`runAudit`), mock every checker that makes network calls (`registry`, `urls`, `advisory`) to avoid flaky tests and slow runs.

**Token counting uses js-tiktoken.** The `budget` command uses `js-tiktoken` with `cl100k_base` encoding (via lazy initialization in `budget/tokenizer.ts`). Do not add `tiktoken` (native bindings) — the JS port avoids platform-specific build issues. Token counts are approximate across model families but within 5%.

**LLM-assisted features always have a non-LLM fallback.** The `verify` and `test` commands use LLMs for semantic analysis but also work (with reduced capability) using only heuristic/deterministic checks when no API key is configured. LLM features are gated behind `src/llm/providers.ts` detection with dynamic imports and try/catch returning null on failure.

## Node Version

Node >= 22 required (pinned in `.node-version`).
