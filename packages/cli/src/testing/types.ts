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

export interface CostEstimate {
	totalEstimatedCost: number;
	perSuite: Array<{
		suiteName: string;
		estimatedCost: number;
		caseCount: number;
		trials: number;
	}>;
}

export interface BaselineDiff {
	regressions: Array<{ caseId: string; wasPassRate: number; nowPassRate: number }>;
	improvements: Array<{ caseId: string; wasPassRate: number; nowPassRate: number }>;
	unchanged: number;
	newCases: string[];
	removedCases: string[];
}
