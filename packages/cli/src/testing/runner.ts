import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gradeCommand } from "./graders/command.js";
import { gradeContains } from "./graders/contains.js";
import { gradeCustom } from "./graders/custom.js";
import { gradeFileExists } from "./graders/file-exists.js";
import { gradeJsonMatch } from "./graders/json-match.js";
import { gradeLlmRubric } from "./graders/llm-rubric.js";
import { gradePackageHas } from "./graders/package-has.js";
import type { AgentHarness } from "./harness/interface.js";
import type { CaseResult, GraderConfig, GraderResult, TestCase, TrialResult } from "./types.js";

export interface RunCaseOptions {
	modelFlag?: string;
	passThreshold: number;
	providerFlag?: string;
	testsDir?: string;
	timeout: number;
	trials: number;
	workDir: string;
}

/**
 * Run a single test case with multiple trials.
 * Sets up fixture (if specified), executes agent, runs graders, aggregates results.
 */
export async function runCase(
	testCase: TestCase,
	harness: AgentHarness,
	options: RunCaseOptions
): Promise<CaseResult> {
	const trialResults: TrialResult[] = [];

	for (let t = 1; t <= options.trials; t++) {
		const start = Date.now();
		let trialWorkDir: string | null = null;

		try {
			// Set up work directory (copy fixture if specified)
			trialWorkDir = await mkdtemp(join(tmpdir(), `skillsafe-test-${testCase.id}-`));

			if (testCase.fixture && options.testsDir) {
				const fixturePath = join(options.testsDir, "..", testCase.fixture);
				try {
					await cp(fixturePath, trialWorkDir, { recursive: true });
				} catch {
					// Fixture not found — proceed with empty dir
				}
			}

			// Execute agent
			const execution = await harness.execute(testCase.prompt, {
				workDir: trialWorkDir,
				timeout: options.timeout,
			});

			// Run graders
			const graderResults = await runGraders(
				testCase.graders,
				trialWorkDir,
				testCase.prompt,
				execution.transcript,
				options
			);

			const allPassed = graderResults.every((g) => g.passed);

			trialResults.push({
				trial: t,
				graderResults,
				passed: allPassed,
				duration: Date.now() - start,
			});
		} catch (error) {
			trialResults.push({
				trial: t,
				graderResults: [],
				passed: false,
				duration: Date.now() - start,
				error: error instanceof Error ? error.message : String(error),
			});
		} finally {
			// Cleanup temp directory
			if (trialWorkDir) {
				try {
					await rm(trialWorkDir, { recursive: true, force: true });
				} catch {
					// cleanup best-effort
				}
			}
		}
	}

	const passedTrials = trialResults.filter((t) => t.passed).length;
	const passRate = trialResults.length > 0 ? passedTrials / trialResults.length : 0;
	const passed = passedTrials >= options.passThreshold;
	const flaky = passedTrials > 0 && passedTrials < trialResults.length;

	return {
		caseId: testCase.id,
		type: testCase.type,
		prompt: testCase.prompt,
		trials: trialResults,
		passed,
		passRate,
		flaky,
	};
}

async function runGraders(
	graders: GraderConfig[],
	workDir: string,
	prompt: string,
	_transcript: string,
	options: RunCaseOptions
): Promise<GraderResult[]> {
	const results: GraderResult[] = [];

	for (const grader of graders) {
		const result = await runSingleGrader(grader, workDir, prompt, options);
		results.push(result);
	}

	return results;
}

// biome-ignore lint/suspicious/useAwait: grader implementations may use await
async function runSingleGrader(
	grader: GraderConfig,
	workDir: string,
	prompt: string,
	options: RunCaseOptions
): Promise<GraderResult> {
	switch (grader.type) {
		case "file-exists":
			return gradeFileExists(workDir, grader.paths);

		case "command":
			return gradeCommand(workDir, grader.run, grader.expect_exit);

		case "contains":
			return gradeContains(workDir, grader.file, grader.patterns, false);

		case "not-contains":
			return gradeContains(workDir, grader.file, grader.patterns, true);

		case "json-match":
			return gradeJsonMatch(workDir, grader.file, grader.schema);

		case "package-has":
			return gradePackageHas(workDir, grader.dependencies, grader.devDependencies);

		case "llm-rubric": {
			const rubricPath =
				grader.rubric && options.testsDir ? join(options.testsDir, "..", grader.rubric) : undefined;
			return gradeLlmRubric(
				workDir,
				grader.criteria,
				rubricPath,
				prompt,
				options.providerFlag,
				options.modelFlag
			);
		}

		case "custom": {
			const modulePath = options.testsDir
				? join(options.testsDir, "..", grader.module)
				: grader.module;
			return gradeCustom(workDir, modulePath);
		}

		default:
			return {
				grader: "unknown",
				passed: false,
				message: `Unknown grader type: ${(grader as { type: string }).type}`,
			};
	}
}
