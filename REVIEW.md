# Codebase Review: Node.js Best Practices, Security, and Improvements

**Date:** 2026-03-07
**Scope:** Full codebase review of `skills-check` — packages/cli/src/ (215+ TypeScript files, 91 test files, 688 tests)

---

## Executive Summary

The skills-check codebase is well-architected with strong separation of concerns (extractor/checker/reporter pattern), consistent async patterns, and thoughtful graceful degradation. However, the review identified **4 medium-severity security issues**, **10 Node.js best practice improvements**, and **16 functionality enhancement opportunities**. None are critical blockers, but several should be addressed before the next release.

---

## 1. Security Findings

### 1.1 Medium Severity

**Symlink following in directory walking** — `shared/discovery.ts:24`, `audit/index.ts:24-56`, `testing/runner.ts:47-48`
- `stat()` follows symlinks, allowing an attacker to place symlinks pointing to arbitrary files outside the intended directory tree. Files get read or copied into test fixtures.
- **Fix:** Use `lstat()` instead of `stat()`, or reject entries where `lstat()` reports a symlink.

**Unsafe shell string construction in OCI isolation** — `isolation/providers/oci.ts:109, 134`
- CLI options are interpolated into a `sh -c "..."` string. A malicious `--format` value like `json && rm -rf /` could break out.
- **Fix:** Use `execFile()` with an args array instead of constructing shell strings.

**Unvalidated `--agent-cmd` template in generic test harness** — `testing/harness/generic.ts:64-65`
- The `--agent-cmd` template value is passed to `exec()` (which spawns a shell). Only the `{prompt}` placeholder is escaped — the rest of the template can contain arbitrary shell commands.
- **Fix:** Validate the template structure or use `execFile()` with argument splitting.

**No integrity checking on dynamic imports** — `llm/providers.ts:88, 122`, `testing/graders/custom.ts:9`
- Dynamic imports of LLM SDKs and custom grader modules have no hash or signature verification. A compromised `node_modules` or malicious SKILL.md `tests/` directory could load arbitrary code.
- **Fix:** For custom graders, add path validation (restrict to skill directory). For SDKs, document the trust boundary.

### 1.2 Low Severity

**No timeout on npm registry requests** — `npm.ts:20, 40`
- `fetch()` calls to the npm registry lack an `AbortController` timeout, so they can hang indefinitely on slow networks.
- **Fix:** Add a 30-second timeout matching the URL checker pattern.

**Cache file permissions not verified** — `audit/cache.ts:34-36`
- Cached JSON files are read without verifying file ownership. An attacker with local write access to `~/.cache/skills-check/audit/` could inject false "package exists" results.
- **Fix:** Check `stat().uid === process.getuid()` on cache reads, or set directory permissions to `0700`.

**Policy file discovery walks to filesystem root** — `policy/parser.ts:191-211`
- The upward directory walk for `.skill-policy.yml` has no stop condition other than reaching `/`. A malicious policy file placed in a parent directory applies silently.
- **Fix:** Stop at `.git` boundary or filesystem root, and add a `--no-discover-policy` flag.

### 1.3 Positive Security Findings

- SSRF mitigation in URL checker blocks cloud metadata endpoints, private IP ranges, and IPv6 loopback
- `safePath()` function properly validates relative paths with `resolve()` and boundary checks
- Only 7 direct dependencies — minimal attack surface
- API keys checked via `process.env`, never logged or serialized
- Container isolation mounts skills read-only with writable work directory
- `safe-regex.ts` validates user-supplied regex patterns for catastrophic backtracking (ReDoS)
- `mkdtemp()` creates secure temp directories, with best-effort cleanup

---

## 2. Node.js Best Practice Findings

### 2.1 Error Handling

| Issue | Location | Severity |
|-------|----------|----------|
| Silent cache failures — no warning if `~/.cache` creation fails | `audit/cache.ts:29, 65` | Medium |
| Fixture loading silently swallows errors including path traversal | `testing/runner.ts:49-51` | Medium |
| DNS resolution errors not distinguished (nonexistent vs. network) | `audit/checkers/urls.ts:70` | Low |
| LLM provider auto-detection shows generic error, not which SDKs were tried | `llm/providers.ts:87-92` | Low |

**Recommendation:** Add `console.warn()` calls in catch blocks where failures affect correctness (cache, fixtures). Preserve the silent-failure pattern only where it's truly advisory.

### 2.2 Resource Leaks

| Issue | Location | Severity |
|-------|----------|----------|
| `clearTimeout` not called in URL checker error path | `audit/checkers/urls.ts:98-102` | Medium |
| Readline interface not closed on error in refresh prompt | `commands/refresh.ts:308-319` | Low |
| No timeout for `execFile` git operations — can hang indefinitely | `verify/git.ts:13, 42, 51, 60` | Medium |

**Recommendation:** Wrap readline in `try-finally`. Add `clearTimeout` to catch blocks. Add `{ timeout: 30_000 }` to `execFileAsync` calls.

### 2.3 Async Patterns

| Issue | Location | Severity |
|-------|----------|----------|
| Minor race condition in `withConcurrencyLimit` — reject can fire after resolve | `registry.ts:91-113, urls.ts:106-136` | Low |
| File reads duplicated when filtering skills by name in policy | `policy/index.ts:46-50, 64` | Low |
| Directory walking runs twice per test (before/after snapshots) | `testing/harness/*.ts` | Low |

**Recommendation:** The concurrency limiter race is theoretical but could be fixed by tracking resolution state. The file read duplication is a simple caching opportunity.

### 2.4 TypeScript Safety

| Issue | Location | Severity |
|-------|----------|----------|
| Unsafe type assertion of cached data without validation | `audit/checkers/skills-sh-api.ts:103` | Medium |
| `JSON.parse` can throw `SyntaxError` if cache is corrupted | `audit/cache.ts:47, 83` | Low |
| Multiple `as Record<string, unknown>` casts without validation | `scanner.ts:54, 62` | Low |
| Grader type coercion without validation | `testing/runner.ts:187` | Low |

**Recommendation:** Add runtime validation (Zod or manual checks) for cached data and external inputs. The `JSON.parse` in `cache.ts` is already inside a try-catch, but the `skills-sh-api.ts` assertion is not.

### 2.5 Performance

| Issue | Location | Severity |
|-------|----------|----------|
| Double `stat()` calls per path in audit/policy discovery | `audit/index.ts:37, policy/index.ts:28` | Low |
| Re-reading all files when filtering by skill name | `policy/index.ts:46-50` | Low |
| `memoryCache` Map in registry checker never reset between test runs | `audit/checkers/registry.ts:10` | Low |

**Recommendation:** Minor optimizations. The double-stat is the easiest win — cache the first stat result.

### 2.6 What the Codebase Gets Right

- Consistent ESM with `.js` extensions throughout
- No circular dependencies — clean module hierarchy
- `fs/promises` used everywhere (no sync I/O)
- `path.join()` used correctly (no string concatenation)
- Lazy initialization for expensive resources (tokenizer, cache dir)
- Module-level state has proper `reset()` functions for test isolation
- Proper `promisify` usage for `execFile`
- Concurrency limiting for network calls (max 5 parallel)
- Deduplication before network requests
- `Promise.allSettled()` for non-blocking error collection

---

## 3. Functionality Improvements

### 3.1 Critical: Test Coverage Gaps

Four commands have **no test files** — approximately 750 lines of untested production code:

| Command | File | Lines | Risk |
|---------|------|-------|------|
| `check` | `commands/check.ts` | 154 | HIGH — core command, used in action.yml |
| `report` | `commands/report.ts` | 124 | HIGH — formatting, data aggregation |
| `init` | `commands/init.ts` | 234 | CRITICAL — interactive mode, 27+ code paths |
| `refresh` | `commands/refresh.ts` | 234 | CRITICAL — LLM integration, file mutations |

**Recommendation:** Create `check.test.ts`, `report.test.ts`, `init.test.ts`, and `refresh.test.ts` following patterns from `audit.test.ts` and `budget.test.ts`.

### 3.2 High: Reporter Format Inconsistency

Not all commands support all output formats:

| Command | Terminal | JSON | Markdown | SARIF |
|---------|----------|------|----------|-------|
| audit | Y | Y | Y | Y |
| budget | Y | Y | Y | - |
| lint | Y | Y | **-** | - |
| verify | Y | Y | **-** | - |
| policy | Y | Y | **-** | - |
| test | Y | Y | Y | - |
| report | - | Y | Y | - |

**Recommendation:** Add markdown reporters for `lint`, `verify`, and `policy`. These are needed for GitHub Action PR comment workflows. SARIF support across commands would enable GitHub Security tab integration.

### 3.3 High: Duplicated Threshold Logic

Severity/threshold comparison logic is duplicated in 3 command files (`audit.ts`, `policy.ts`, `lint.ts`) with identical patterns. Output formatting boilerplate (format switch + file write) appears ~6 times.

**Recommendation:** Create `shared/threshold.ts` with a generic threshold checker and `shared/output.ts` for format routing. Reduces ~180 lines of duplication.

### 3.4 High: No Global Configuration File

All settings require CLI flags. No `.skillscheckrc.yml` or equivalent exists for persisting project defaults.

**Recommendation:** Implement a 3-level config cascade: CLI flags > project config > user config. This would eliminate repeated flag entry and simplify CI integration.

### 3.5 Medium: Missing Progress Feedback

Long-running commands (`audit` 30s+, `test` 1-5min, `verify` 30s+) provide no progress indicators. Even `--verbose` lacks step-by-step feedback.

**Recommendation:** Add structured progress output: file counts, step indicators, completion percentages. Use the existing `chalk` dependency for terminal formatting.

### 3.6 Medium: Inconsistent `--quiet`/`--verbose` Support

Only `audit` and `verify` support both `--quiet` and `--verbose`. Other commands support neither or only one.

**Recommendation:** Standardize across all commands. All should accept `--quiet` (suppress output) and `--verbose` (show progress), with mutual exclusion validation.

### 3.7 Medium: Complex Orchestrator Functions

5 orchestrator functions bypass Biome's cognitive complexity checks (`// biome-ignore`). The largest is `commands/refresh.ts` at 234 lines.

**Recommendation:** Extract sub-steps into helper functions. For example, `runAudit()` could be split into `discoverAndLoadSkills()`, `selectCheckers()`, `processFiles()`, and `aggregateFindings()`.

### 3.8 Medium: No Programmatic API

The package only exports a CLI binary (`"bin": { "skills-check": ... }`). Core functions like `runAudit()`, `runBudget()`, etc. are not importable as a library.

**Recommendation:** Add `"exports"` to `package.json` and create an API entry point. Enables IDE integrations, custom dashboards, and monorepo tooling.

### 3.9 Low: Cross-Command Integration

- **Health check composite**: A `skills-check health` command running `audit` + `lint` + `budget` + `policy` would serve as a single CI gate.
- **Budget trending**: No way to compare multiple snapshots or track budget growth over time.
- **Test baseline from CI**: No workflow for generating baselines in CI pipelines.

### 3.10 Low: Incomplete Action Outputs

The GitHub Action (`action.yml`) exposes only 4 outputs (`stale-count`, `issue-number`, `report`, `results`). Per-command structured outputs (finding counts, token totals, pass/fail) would enable richer workflow conditionals.

---

## Prioritized Improvement Roadmap

### Phase 1 — Immediate (Security + Regression Risk)
1. Replace `stat()` with `lstat()` in discovery/test runner (symlink fix)
2. Use `execFile()` args array in OCI isolation provider (injection fix)
3. Add `AbortController` timeout to npm registry fetch calls
4. Write `check.test.ts` and `report.test.ts`
5. Add `clearTimeout` to URL checker error path

### Phase 2 — Next Release (Quality + UX)
1. Write `init.test.ts` and `refresh.test.ts`
2. Add markdown reporters for `lint`, `policy`, `verify`
3. Extract duplicated threshold logic to `shared/threshold.ts`
4. Add git operation timeouts in `verify/git.ts`
5. Add readline try-finally in `commands/refresh.ts`
6. Standardize `--quiet`/`--verbose` across all commands

### Phase 3 — Future (Extensibility)
1. Implement `.skillscheckrc.yml` global configuration
2. Add progress indicators for long-running commands
3. Export programmatic API from package
4. Add composite `health` command
5. Expand action.yml with per-command outputs
6. Add SARIF reporters for all commands
