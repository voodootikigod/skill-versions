# Skill Testing / Eval Integration

> **Owner:** 🤝 Joint — 📐 Spec (convention) + 🔧 skills-check (regression harness) + 📦 skills.sh (run infrastructure)
> **Priority:** 🔴 Quadrant 1 — High Novelty, High Impact
> **Novelty:** ★★★★☆ | **Impact:** ★★★★★

## Summary

A standardized convention for declaring test cases within a skill, plus CLI integration to run those tests against an agent. Builds on existing eval methodology (OpenAI eval-skills, Anthropic demystifying-evals, Vercel agent-eval) but connects it to the skill format itself so that testing is as natural as `cargo test` — built into the workflow, not bolted on after the fact.

## Current State of the Art

The building blocks exist but are disconnected:

- **OpenAI** published a practical guide for testing Codex skills with CSV prompt sets, deterministic checks, and LLM-graded rubrics. They split evals into outcome, process, style, and efficiency goals. But there's no standardized format — every author builds their own harness.
- **Anthropic** provided taxonomy and vocabulary (capability vs. regression evals, grader types, trial/transcript concepts) plus the insight that you're always testing skill + agent + model together. But it's theoretical guidance, not tooling.
- **Vercel's agent-eval** is the most concrete implementation: `PROMPT.md` + `EVAL.ts` per fixture, Vitest as the test runner, A/B testing infrastructure. But it's designed for framework authors testing agent compatibility, not skill authors testing individual skills.

The gap is integration: nobody has connected eval infrastructure to the SKILL.md format.

## Proposed Convention

### Directory Structure

A skill with tests follows this structure:

```
my-skill/
  SKILL.md              # The skill itself
  tests/                # Test directory (conventional location)
    cases.yaml          # Test case declarations
    graders/            # Custom grading logic (optional)
      structure.ts      # Code-based grader
      quality.md        # LLM rubric grader
    fixtures/           # Starter files for test scenarios (optional)
      empty-project/
        package.json
```

### Test Case Declaration (cases.yaml)

```yaml
# Test suite metadata
suite:
  name: "ai-sdk-core tests"
  product-version: "6.0.105"
  timeout: 120  # seconds per case
  trials: 3     # runs per case for consistency

cases:
  # Trigger test: should this prompt invoke the skill?
  - id: trigger-explicit
    type: trigger
    prompt: "Use the $ai-sdk-core skill to generate text with streaming"
    expect_trigger: true

  - id: trigger-negative
    type: trigger
    prompt: "Help me set up a REST API with Express"
    expect_trigger: false

  # Outcome test: does the agent produce correct results?
  - id: generate-text-basic
    type: outcome
    prompt: "Create a simple text generation script using the AI SDK"
    fixture: fixtures/empty-project
    graders:
      - type: file-exists
        paths: ["src/generate.ts", "package.json"]
      - type: command
        run: "npx tsc --noEmit"
        expect_exit: 0
      - type: contains
        file: "src/generate.ts"
        patterns: ["generateText", "import.*ai"]
      - type: not-contains
        file: "src/generate.ts"
        patterns: ["generateText.*model.*gpt"]  # Should not hardcode a model

  # Regression test: does the skill still handle known edge cases?
  - id: streaming-response
    type: outcome
    prompt: "Create a streaming text generation endpoint that handles backpressure"
    fixture: fixtures/empty-project
    graders:
      - type: file-exists
        paths: ["src/stream.ts"]
      - type: contains
        file: "src/stream.ts"
        patterns: ["streamText", "TextStream"]
      - type: llm-rubric
        rubric: graders/quality.md
        criteria:
          - "Uses streamText from the AI SDK, not raw fetch"
          - "Handles the stream correctly with async iteration"
          - "Does not use deprecated streamingTextResponse"

  # Style test: does output follow conventions?
  - id: code-style
    type: style
    prompt: "Generate a structured output parser using the AI SDK"
    graders:
      - type: llm-rubric
        rubric: graders/quality.md
        criteria:
          - "Uses TypeScript with proper type annotations"
          - "Uses zod for schema definition"
          - "Does not use any deprecated APIs"
```

### Grader Types

#### Built-in (Code-based)
- `file-exists` — Check that specific files were created
- `command` — Run a shell command and check exit code
- `contains` / `not-contains` — Regex patterns in file content
- `json-match` — Validate JSON structure in files
- `package-has` — Check package.json has specific dependencies

#### LLM-based
- `llm-rubric` — Pass output to an LLM with a rubric markdown file and specific criteria. Return pass/fail per criterion with explanation.

#### Custom
- `custom` — Point to a TypeScript file that exports a `grade(context) => Result` function for arbitrary logic.

### Rubric File (graders/quality.md)

```markdown
# Code Quality Rubric for AI SDK Skills

You are evaluating code generated by an AI agent that was given instructions
from an AI SDK skill file.

Score each criterion as PASS or FAIL with a brief explanation.

## Evaluation Context
- The agent was asked: {{prompt}}
- The skill targets AI SDK version: {{product_version}}
- Files produced: {{file_list}}

## Criteria
Evaluate each criterion provided in the test case definition.
For each criterion, respond with:
- PASS: if the code meets the criterion
- FAIL: if the code does not meet the criterion
- Explanation: brief reasoning

Be strict. If the code uses deprecated APIs or incorrect patterns
for the declared product version, it should FAIL.
```

## CLI Interface

### Running Tests (integrated into skills-check)

```bash
# Run all tests for all skills
npx skills-check test

# Run tests for a specific skill
npx skills-check test --skill ai-sdk-core

# Run only trigger tests (fast, no agent execution)
npx skills-check test --type trigger

# Run with a specific agent/model combination
npx skills-check test --agent claude-code --model opus

# Run with verbose output showing each grader result
npx skills-check test --verbose

# Run in CI mode (JSON output, strict exit codes)
npx skills-check test --ci --output test-results.json

# Dry run: show what would be tested without executing
npx skills-check test --dry
```

### After a Refresh (regression pipeline)

```bash
# The key integration: refresh + test
npx skills-check check          # Find stale skills
npx skills-check refresh         # AI-assisted update
npx skills-check test --type regression  # Verify nothing broke
```

This is the pipeline: detect staleness → refresh → verify. The test step catches cases where the AI-assisted refresh introduced errors.

## Implementation Architecture

```
skills-check test
  ├── Discover skills with tests/ directories
  ├── Parse cases.yaml for each skill
  ├── For trigger tests:
  │   ├── Present the prompt to the agent
  │   └── Check if the skill was invoked (agent-specific detection)
  ├── For outcome/style tests:
  │   ├── Set up fixture directory (if specified)
  │   ├── Execute the prompt via agent harness
  │   │   ├── Claude Code: `claude-code exec --full-auto 'prompt'`
  │   │   ├── Codex: `codex exec --full-auto 'prompt'`
  │   │   └── Generic: configurable agent command
  │   ├── Run code-based graders against resulting files
  │   ├── Run LLM-based graders against resulting files
  │   └── Aggregate scores
  ├── Run multiple trials per case (configurable)
  ├── Report results
  │   ├── Per-case pass/fail with grader details
  │   ├── Overall pass rate
  │   └── Comparison to previous run (if baseline exists)
  └── Exit with appropriate code
```

## Key Implementation Considerations

### Agent Harness Abstraction
The test runner needs to execute prompts through different agents. Abstract this as a configurable `AgentHarness` interface:

```typescript
interface AgentHarness {
  name: string;
  execute(prompt: string, options: {
    workDir: string;
    timeout: number;
    skills: string[];  // Which skills to make available
  }): Promise<{
    exitCode: number;
    transcript: string;
    filesCreated: string[];
    duration: number;
    tokenUsage?: { input: number; output: number };
  }>;
}
```

Implementations for Claude Code (`claude exec`), Codex (`codex exec`), and a generic shell-based harness.

### Cost Management
Each outcome test involves real LLM calls. Considerations:
- Default to cheapest viable model for testing (Haiku/Sonnet, not Opus)
- Cache test results with content-hash keys (same skill content + same prompt = reuse result)
- `--dry` mode for cost estimation before running
- Budget limits: `--max-cost 5.00` to cap spend per test run
- Trigger tests are cheap (just classification); outcome tests are expensive (full agent execution)

### Determinism and Flakiness
LLM outputs are non-deterministic. Mitigations:
- Multiple trials per case (default 3, configurable)
- Pass threshold: "2 of 3 trials must pass" rather than "all must pass"
- Separate flaky rate tracking: if a test passes 1/3 times, it's flagged as flaky
- Graders should be tolerant of valid variations (regex patterns, not exact string matches)

### Trigger Detection
Detecting whether a skill was invoked is agent-specific:
- Claude Code: Check if the skill appears in the agent's transcript/trace
- Codex: Check if the skill's SKILL.md was loaded into context
- Generic: May not be detectable — skip trigger tests for unknown agents

### Baseline and Regression Tracking
- Store test results in `.skills-check/test-baselines/` as JSON
- On subsequent runs, compare against baseline and highlight regressions
- `skills-check test --update-baseline` to accept current results as the new baseline

## Spec Proposal (for agentskills.io discussion)

Add to the Agent Skills spec:
1. A conventional `tests/` directory within a skill
2. A `cases.yaml` schema for declaring test cases
3. Standard grader types that any test runner should support
4. Recommendation that skills targeting versioned products include at least one regression test

## File Structure for Implementation

```
src/
  commands/
    test.ts                 # CLI command handler
  testing/
    index.ts                # Test orchestrator
    discovery.ts            # Find skills with tests/ directories
    parser.ts               # Parse cases.yaml
    harness/
      interface.ts          # AgentHarness interface
      claude-code.ts        # Claude Code implementation
      codex.ts              # Codex implementation
      generic.ts            # Shell-based generic harness
    graders/
      file-exists.ts
      command.ts
      contains.ts
      json-match.ts
      package-has.ts
      llm-rubric.ts
      custom.ts
    runner.ts               # Execute cases with trials
    baseline.ts             # Baseline storage and comparison
    reporters/
      terminal.ts
      json.ts
      markdown.ts
    cost.ts                 # Cost estimation and budget tracking
```

## Testing Strategy (for the test runner itself)

- Unit tests for each grader type with known inputs
- Unit tests for cases.yaml parsing with valid and invalid fixtures
- Integration test with a mock agent harness that returns deterministic results
- End-to-end test with a simple skill + test suite using a real agent (marked as slow/expensive)

## Success Criteria

- Running `skills-check test` on a skill with 5 test cases completes in < 2 minutes
- The refresh → test pipeline catches at least 80% of introduced regressions in manual testing
- Test case format is simple enough that a skill author can write their first test in < 10 minutes
- Works with at least Claude Code and one other agent
