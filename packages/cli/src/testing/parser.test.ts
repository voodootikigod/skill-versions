import { describe, expect, it } from "vitest";
import { parseTestSuite, validateTestSuite } from "./parser.js";

const VALID_CASES_YAML = `
suite:
  name: "test-suite"
  product-version: "1.0.0"
  timeout: 60
  trials: 2

cases:
  - id: basic-test
    type: outcome
    prompt: "Create a hello world file"
    graders:
      - type: file-exists
        paths: ["hello.ts"]
      - type: contains
        file: hello.ts
        patterns: ["hello"]
`;

const TRIGGER_CASES_YAML = `
suite:
  name: "trigger-suite"

cases:
  - id: trigger-yes
    type: trigger
    prompt: "Use the skill to do X"
    expect_trigger: true
  - id: trigger-no
    type: trigger
    prompt: "Do something unrelated"
    expect_trigger: false
`;

const ALL_GRADERS_YAML = `
suite:
  name: "all-graders"

cases:
  - id: all-graders-test
    type: outcome
    prompt: "Build a project"
    graders:
      - type: file-exists
        paths: ["src/index.ts", "package.json"]
      - type: command
        run: "echo ok"
        expect_exit: 0
      - type: contains
        file: src/index.ts
        patterns: ["import", "export"]
      - type: not-contains
        file: src/index.ts
        patterns: ['eval(']
      - type: json-match
        file: package.json
        schema:
          name: "string"
          version: "string"
      - type: package-has
        dependencies: ["express"]
        devDependencies: ["vitest"]
      - type: llm-rubric
        criteria:
          - "Uses TypeScript"
          - "Has proper imports"
      - type: custom
        module: graders/custom.ts
`;

describe("parseTestSuite", () => {
	it("parses valid cases.yaml", async () => {
		const suite = await parseTestSuite(VALID_CASES_YAML);
		expect(suite.name).toBe("test-suite");
		expect(suite.productVersion).toBe("1.0.0");
		expect(suite.timeout).toBe(60);
		expect(suite.trials).toBe(2);
		expect(suite.cases).toHaveLength(1);
		expect(suite.cases[0].id).toBe("basic-test");
		expect(suite.cases[0].type).toBe("outcome");
		expect(suite.cases[0].graders).toHaveLength(2);
	});

	it("parses trigger cases", async () => {
		const suite = await parseTestSuite(TRIGGER_CASES_YAML);
		expect(suite.name).toBe("trigger-suite");
		expect(suite.cases).toHaveLength(2);
		expect(suite.cases[0].expectTrigger).toBe(true);
		expect(suite.cases[1].expectTrigger).toBe(false);
	});

	it("parses all grader types", async () => {
		const suite = await parseTestSuite(ALL_GRADERS_YAML);
		const graders = suite.cases[0].graders;
		expect(graders).toHaveLength(8);

		expect(graders[0].type).toBe("file-exists");
		expect(graders[1].type).toBe("command");
		expect(graders[2].type).toBe("contains");
		expect(graders[3].type).toBe("not-contains");
		expect(graders[4].type).toBe("json-match");
		expect(graders[5].type).toBe("package-has");
		expect(graders[6].type).toBe("llm-rubric");
		expect(graders[7].type).toBe("custom");
	});

	it("uses defaults for missing suite fields", async () => {
		const suite = await parseTestSuite(`
cases:
  - id: test
    type: outcome
    prompt: "test prompt"
`);
		expect(suite.name).toBe("unnamed");
		expect(suite.timeout).toBe(120);
		expect(suite.trials).toBe(3);
	});

	it("throws on invalid YAML", async () => {
		await expect(parseTestSuite("not: valid: yaml: [")).rejects.toThrow();
	});

	it("throws when cases is not an array", async () => {
		await expect(
			parseTestSuite(`
suite:
  name: test
cases: "not an array"
`)
		).rejects.toThrow("'cases' must be an array");
	});
});

describe("validateTestSuite", () => {
	it("returns empty array for valid suite", async () => {
		const suite = await parseTestSuite(VALID_CASES_YAML);
		const errors = validateTestSuite(suite);
		expect(errors).toEqual([]);
	});

	it("detects missing case id", async () => {
		const suite = await parseTestSuite(`
suite:
  name: test
cases:
  - type: outcome
    prompt: "test"
`);
		const errors = validateTestSuite(suite);
		expect(errors).toContain("Test case is missing an id");
	});

	it("detects duplicate case ids", async () => {
		const suite = await parseTestSuite(`
suite:
  name: test
cases:
  - id: dup
    type: outcome
    prompt: "test 1"
  - id: dup
    type: outcome
    prompt: "test 2"
`);
		const errors = validateTestSuite(suite);
		expect(errors.some((e) => e.includes("Duplicate case id"))).toBe(true);
	});

	it("detects missing prompt", async () => {
		const suite = await parseTestSuite(`
suite:
  name: test
cases:
  - id: no-prompt
    type: outcome
`);
		const errors = validateTestSuite(suite);
		expect(errors.some((e) => e.includes("missing prompt"))).toBe(true);
	});

	it("detects trigger test without expect_trigger", async () => {
		const suite = await parseTestSuite(`
suite:
  name: test
cases:
  - id: trigger-missing
    type: trigger
    prompt: "test"
`);
		const errors = validateTestSuite(suite);
		expect(errors.some((e) => e.includes("expect_trigger"))).toBe(true);
	});

	it("detects empty file-exists paths", async () => {
		const suite = await parseTestSuite(`
suite:
  name: test
cases:
  - id: empty-paths
    type: outcome
    prompt: "test"
    graders:
      - type: file-exists
        paths: []
`);
		const errors = validateTestSuite(suite);
		expect(errors.some((e) => e.includes("at least one path"))).toBe(true);
	});

	it("detects empty llm-rubric criteria", async () => {
		const suite = await parseTestSuite(`
suite:
  name: test
cases:
  - id: no-criteria
    type: outcome
    prompt: "test"
    graders:
      - type: llm-rubric
        criteria: []
`);
		const errors = validateTestSuite(suite);
		expect(errors.some((e) => e.includes("at least one criterion"))).toBe(true);
	});

	it("detects empty suite", () => {
		const errors = validateTestSuite({
			name: "test",
			timeout: 120,
			trials: 3,
			cases: [],
		});
		expect(errors).toContain("Suite has no test cases");
	});
});
