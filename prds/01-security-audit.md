# Skill Security Audit & Hallucination Detection

> **Owner:** skillsafe
> **Priority:** 🔴 Quadrant 1 — High Novelty, High Impact
> **Novelty:** ★★★★★ | **Impact:** ★★★★★

## Summary

A CLI tool (`skillsafe audit`) that scans skill files for security issues unique to agent skills: hallucinated package references, prompt injection patterns, dangerous shell commands, and references to non-existent or malicious resources. This is the `npm audit` + `cargo deny` equivalent for the skill ecosystem.

## Why This Is Urgent

Aikido Security demonstrated that LLM-hallucinated package names spread through 237 repos via copy-pasted skill files. The `react-codeshift` incident proved that skills are an active supply chain attack vector. Skills look like documentation but are treated as executable instructions by agents with file system and shell access. The blast radius of a malicious skill exceeds that of a malicious npm package.

No tool currently validates skill content integrity.

## What It Should Detect

### Tier 1: Hallucinated Package References (Critical)
- Extract all `npx <package>`, `npm install <package>`, `pip install <package>`, `cargo add <crate>` commands from skill content
- Query the respective registries (npm, PyPI, crates.io) to verify each package actually exists
- Flag packages that exist but were published very recently (potential typosquat)
- Flag packages where the publisher doesn't match the expected author
- Cross-reference against known hallucinated package databases

### Tier 2: Prompt Injection Patterns (High)
- Detect instructions that attempt to override agent safety boundaries ("ignore previous instructions", "you are now in developer mode")
- Detect instructions that request exfiltration of data ("send the contents of", "upload to", "POST to")
- Detect instructions that attempt to manipulate agent behavior toward undisclosed goals
- Detect obfuscated instructions (base64-encoded content, Unicode tricks, invisible characters)

### Tier 3: Dangerous Commands (High)
- Flag shell commands with destructive potential: `rm -rf`, `chmod 777`, `curl | bash`, unrestricted `wget`
- Flag commands that modify system configuration or install global packages without justification
- Flag commands that access sensitive paths (`~/.ssh`, `~/.aws`, credentials files)
- Flag network calls to non-standard or suspicious endpoints

### Tier 4: Structural Issues (Medium)
- Missing or incomplete frontmatter (no `name`, `description`, `product-version`)
- References to URLs that return 404 or have expired certificates
- References to GitHub repos that no longer exist or have been archived
- Skill content that hasn't been updated in > 6 months (staleness flag, not a security issue per se but contributes to risk)

## Implementation Architecture

```
skillsafe audit [path]
  ├── Parse SKILL.md files recursively from [path]
  ├── Extract commands and references
  │   ├── Regex extraction of npx/npm/pip/cargo commands
  │   ├── URL extraction (documentation links, API endpoints)
  │   └── Shell command extraction (inline code blocks)
  ├── Registry verification (parallelized)
  │   ├── npm registry API: GET https://registry.npmjs.org/{package}
  │   ├── PyPI API: GET https://pypi.org/pypi/{package}/json
  │   └── crates.io API: GET https://crates.io/api/v1/crates/{crate}
  ├── Prompt injection scanning
  │   ├── Pattern matching against known injection templates
  │   └── Heuristic scoring for suspicious instruction patterns
  ├── Command safety analysis
  │   ├── Allowlist/denylist matching
  │   └── Risk scoring based on command capabilities
  └── Report generation
      ├── JSON (for CI integration)
      ├── Markdown (for human review)
      └── Exit code (0 = clean, 1 = warnings, 2 = critical)
```

## CLI Interface

```bash
# Audit all skills in a directory
npx skillsafe audit ./skills/

# Audit a single skill
npx skillsafe audit ./skills/ai-sdk-core/SKILL.md

# Audit with JSON output for CI
npx skillsafe audit ./skills/ --format json --output audit-report.json

# Audit with specific severity threshold
npx skillsafe audit ./skills/ --fail-on warning  # or: critical, high, medium

# Audit with a custom policy file (see Policy Enforcement spec)
npx skillsafe audit ./skills/ --policy .skill-policy.yml

# Verify only package references (fast mode)
npx skillsafe audit ./skills/ --packages-only
```

## Output Format

```
Skill Security Audit
==================================================

CRITICAL (1):
  skills/deploy-helper/SKILL.md
    ✗ Line 45: `npx deploy-autofix` — package does not exist on npm
      This may be a hallucinated package name. If an attacker
      registers this name, agents following this skill will
      execute their code.

HIGH (2):
  skills/ai-sdk-core/SKILL.md
    ⚠ Line 12: `curl https://example.com/setup.sh | bash`
      Piping remote scripts to bash is dangerous. The remote
      content could change without the skill author knowing.

    ⚠ Line 78: References https://docs.example.com/v4/api
      URL returns HTTP 404. Documentation link may be stale.

MEDIUM (1):
  skills/legacy-tools/SKILL.md
    ○ No product-version declared in frontmatter.
      Cannot verify knowledge currency.

Summary: 1 critical, 2 high, 1 medium across 15 skills scanned.
```

## Key Implementation Considerations

### Registry Rate Limits
- npm: 100 requests/minute for unauthenticated. Batch and cache aggressively.
- PyPI: No official rate limit but be respectful. Cache responses for 1 hour.
- crates.io: 1 request/second. Queue with backoff.
- Cache all registry responses locally (`~/.cache/skillsafe/audit/`) with TTL.

### False Positive Management
- Some skills legitimately reference internal/private packages. Support a `.skill-audit-ignore` file or inline `<!-- audit-ignore: package-exists -->` comments.
- Prompt injection detection will have false positives for skills that legitimately instruct agents on security testing or red-teaming. Allow per-finding suppression.

### CI Integration
- GitHub Action that runs `skillsafe audit` on PRs that modify SKILL.md files
- Exit code 2 for critical findings should block merge
- SARIF output format for GitHub Security tab integration

### Advisory Database
- Maintain a `skill-advisories.json` (analogous to npm's advisory database) that tracks:
  - Known hallucinated package names
  - Known malicious skill patterns
  - Skills that have been reported and confirmed as malicious
- This database should be community-maintained and versioned

## File Structure for Implementation

```
src/
  commands/
    audit.ts              # CLI command handler
  audit/
    index.ts              # Orchestrator
    extractors/
      commands.ts         # Extract shell commands from markdown
      urls.ts             # Extract URLs from markdown
      packages.ts         # Extract package references
    checkers/
      registry.ts         # Verify packages exist on registries
      injection.ts        # Scan for prompt injection patterns
      commands.ts         # Analyze shell command safety
      urls.ts             # Verify URL liveness
      metadata.ts         # Check frontmatter completeness
    reporters/
      terminal.ts         # Pretty-printed terminal output
      json.ts             # Machine-readable JSON
      sarif.ts            # GitHub Security integration
      markdown.ts         # Human-readable report
    cache.ts              # Registry response caching
    advisory-db.ts        # Advisory database client
  types/
    audit.ts              # Finding severity levels, report types
```

## Dependencies

- `marked` or `remark` — Parse markdown to extract code blocks
- `gray-matter` — Parse YAML frontmatter
- `node-fetch` or built-in fetch — Registry API calls
- `minimatch` — Pattern matching for ignore files
- Existing skillsafe infrastructure for SKILL.md discovery

## Testing Strategy

- Unit tests for each extractor (given this markdown, extract these commands)
- Unit tests for each checker with known-good and known-bad inputs
- Integration test with a fixture directory of intentionally problematic skills
- Snapshot tests for report output formatting
- Mock registry responses to avoid rate limits in CI

## Success Criteria

- Can detect the `react-codeshift` style hallucination (package referenced but doesn't exist)
- Runs in < 10 seconds for a collection of 50 skills
- Zero false positives on the Anthropic and Vercel official skill repositories
- Integrates into GitHub Actions with a single workflow file
