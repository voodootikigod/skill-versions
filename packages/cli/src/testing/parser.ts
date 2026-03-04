import type { GraderConfig, TestCase, TestSuite } from "./types.js";

const VALID_TYPES = new Set(["trigger", "outcome", "style", "regression"]);
const VALID_GRADER_TYPES = new Set([
	"file-exists",
	"command",
	"contains",
	"not-contains",
	"json-match",
	"package-has",
	"llm-rubric",
	"custom",
]);

/**
 * Parse a cases.yaml string into a TestSuite.
 * Uses dynamic import of js-yaml (transitive dep of gray-matter).
 */
export async function parseTestSuite(content: string): Promise<TestSuite> {
	const yaml = await import("js-yaml");
	const raw = yaml.load(content) as Record<string, unknown>;

	if (!raw || typeof raw !== "object") {
		throw new Error("Invalid cases.yaml: expected an object");
	}

	const suiteRaw = (raw.suite ?? {}) as Record<string, unknown>;
	const casesRaw = raw.cases as unknown[];

	if (!Array.isArray(casesRaw)) {
		throw new Error("Invalid cases.yaml: 'cases' must be an array");
	}

	const suite: TestSuite = {
		name: typeof suiteRaw.name === "string" ? suiteRaw.name : "unnamed",
		productVersion:
			typeof suiteRaw["product-version"] === "string"
				? (suiteRaw["product-version"] as string)
				: undefined,
		timeout: typeof suiteRaw.timeout === "number" ? suiteRaw.timeout : 120,
		trials: typeof suiteRaw.trials === "number" ? suiteRaw.trials : 3,
		cases: [],
	};

	for (const item of casesRaw) {
		const c = item as Record<string, unknown>;
		const testCase: TestCase = {
			id: String(c.id ?? ""),
			type: String(c.type ?? "outcome") as TestCase["type"],
			prompt: String(c.prompt ?? ""),
			expectTrigger: typeof c.expect_trigger === "boolean" ? c.expect_trigger : undefined,
			fixture: typeof c.fixture === "string" ? c.fixture : undefined,
			graders: parseGraders(c.graders),
		};
		suite.cases.push(testCase);
	}

	return suite;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
function parseGraders(raw: unknown): GraderConfig[] {
	if (!Array.isArray(raw)) {
		return [];
	}

	const configs: GraderConfig[] = [];
	for (const item of raw) {
		const g = item as Record<string, unknown>;
		const type = String(g.type ?? "");

		switch (type) {
			case "file-exists":
				configs.push({
					type: "file-exists",
					paths: Array.isArray(g.paths) ? g.paths.map(String) : [],
				});
				break;
			case "command":
				configs.push({
					type: "command",
					run: String(g.run ?? ""),
					expect_exit: typeof g.expect_exit === "number" ? g.expect_exit : 0,
				});
				break;
			case "contains":
				configs.push({
					type: "contains",
					file: String(g.file ?? ""),
					patterns: Array.isArray(g.patterns) ? g.patterns.map(String) : [],
				});
				break;
			case "not-contains":
				configs.push({
					type: "not-contains",
					file: String(g.file ?? ""),
					patterns: Array.isArray(g.patterns) ? g.patterns.map(String) : [],
				});
				break;
			case "json-match":
				configs.push({
					type: "json-match",
					file: String(g.file ?? ""),
					schema:
						typeof g.schema === "object" && g.schema !== null
							? (g.schema as Record<string, unknown>)
							: {},
				});
				break;
			case "package-has":
				configs.push({
					type: "package-has",
					dependencies: Array.isArray(g.dependencies) ? g.dependencies.map(String) : undefined,
					devDependencies: Array.isArray(g.devDependencies)
						? g.devDependencies.map(String)
						: undefined,
				});
				break;
			case "llm-rubric":
				configs.push({
					type: "llm-rubric",
					rubric: typeof g.rubric === "string" ? g.rubric : undefined,
					criteria: Array.isArray(g.criteria) ? g.criteria.map(String) : [],
				});
				break;
			case "custom":
				configs.push({
					type: "custom",
					module: String(g.module ?? ""),
				});
				break;
			default:
				// Skip unknown grader types
				break;
		}
	}

	return configs;
}

/**
 * Validate a parsed TestSuite and return an array of error messages.
 * An empty array means the suite is valid.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
export function validateTestSuite(suite: TestSuite): string[] {
	const errors: string[] = [];

	if (!suite.name) {
		errors.push("Suite is missing a name");
	}

	if (suite.cases.length === 0) {
		errors.push("Suite has no test cases");
	}

	const ids = new Set<string>();
	for (const c of suite.cases) {
		if (!c.id) {
			errors.push("Test case is missing an id");
		} else if (ids.has(c.id)) {
			errors.push(`Duplicate case id: "${c.id}"`);
		} else {
			ids.add(c.id);
		}

		if (!VALID_TYPES.has(c.type)) {
			errors.push(`Case "${c.id}": invalid type "${c.type}"`);
		}

		if (!c.prompt) {
			errors.push(`Case "${c.id}": missing prompt`);
		}

		if (c.type === "trigger" && c.expectTrigger === undefined) {
			errors.push(`Case "${c.id}": trigger tests must specify expect_trigger`);
		}

		for (const g of c.graders) {
			if (!VALID_GRADER_TYPES.has(g.type)) {
				errors.push(`Case "${c.id}": unknown grader type "${g.type}"`);
			}

			if (g.type === "file-exists" && g.paths.length === 0) {
				errors.push(`Case "${c.id}": file-exists grader must have at least one path`);
			}

			if (g.type === "command" && !g.run) {
				errors.push(`Case "${c.id}": command grader must specify 'run'`);
			}

			if (g.type === "contains" && (!g.file || g.patterns.length === 0)) {
				errors.push(`Case "${c.id}": contains grader must specify file and patterns`);
			}

			if (g.type === "not-contains" && (!g.file || g.patterns.length === 0)) {
				errors.push(`Case "${c.id}": not-contains grader must specify file and patterns`);
			}

			if (g.type === "llm-rubric" && g.criteria.length === 0) {
				errors.push(`Case "${c.id}": llm-rubric grader must have at least one criterion`);
			}

			if (g.type === "custom" && !g.module) {
				errors.push(`Case "${c.id}": custom grader must specify 'module'`);
			}
		}
	}

	return errors;
}
