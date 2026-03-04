export interface TestSuite {
	cases: TestCase[];
	name: string;
	productVersion?: string;
	timeout: number;
	trials: number;
}

export interface TestCase {
	expectTrigger?: boolean;
	fixture?: string;
	graders: GraderConfig[];
	id: string;
	prompt: string;
	type: "trigger" | "outcome" | "style" | "regression";
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
	detail?: string;
	grader: string;
	message: string;
	passed: boolean;
}

export interface TrialResult {
	duration: number;
	error?: string;
	graderResults: GraderResult[];
	passed: boolean;
	trial: number;
}

export interface CaseResult {
	caseId: string;
	flaky: boolean;
	passed: boolean;
	passRate: number;
	prompt: string;
	trials: TrialResult[];
	type: TestCase["type"];
}

export interface TestReport {
	cases: CaseResult[];
	failed: number;
	generatedAt: string;
	passed: number;
	skillName: string;
	skillPath: string;
	skipped: number;
	suite: string;
	totalDuration: number;
}

export interface AgentExecution {
	duration: number;
	exitCode: number;
	filesCreated: string[];
	tokenUsage?: { input: number; output: number };
	transcript: string;
}

export interface TestOptions {
	agent?: string;
	agentCmd?: string;
	ci?: boolean;
	dry?: boolean;
	format?: "terminal" | "json" | "markdown";
	maxCost?: number;
	model?: string;
	output?: string;
	passThreshold?: number;
	provider?: string;
	skill?: string;
	timeout?: number;
	trials?: number;
	type?: string;
	updateBaseline?: boolean;
	verbose?: boolean;
}

export interface CostEstimate {
	perSuite: Array<{
		suiteName: string;
		estimatedCost: number;
		caseCount: number;
		trials: number;
	}>;
	totalEstimatedCost: number;
}

export interface BaselineDiff {
	improvements: Array<{ caseId: string; wasPassRate: number; nowPassRate: number }>;
	newCases: string[];
	regressions: Array<{ caseId: string; wasPassRate: number; nowPassRate: number }>;
	removedCases: string[];
	unchanged: number;
}
