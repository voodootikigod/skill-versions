import { readFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { compareBaseline, loadBaseline, saveBaseline } from "./baseline.js";
import { estimateTestCost } from "./cost.js";
import { discoverTestableSkills } from "./discovery.js";
import { ClaudeCodeHarness } from "./harness/claude-code.js";
import { GenericHarness } from "./harness/generic.js";
import type { AgentHarness } from "./harness/interface.js";
import { parseTestSuite, validateTestSuite } from "./parser.js";
import { runCase } from "./runner.js";
import type { BaselineDiff, CaseResult, TestOptions, TestReport, TestSuite } from "./types.js";

/**
 * Run test suites for discovered skills.
 * Main orchestrator: discover -> parse -> (dry/execute) -> baseline -> report.
 */
export async function runTests(
	dir: string,
	options: TestOptions,
): Promise<{
	reports: TestReport[];
	baselineDiffs: Map<string, BaselineDiff>;
	costEstimate?: ReturnType<typeof estimateTestCost>;
}> {
	// 1. Discover testable skills
	const testableSkills = await discoverTestableSkills(dir, options.skill);

	if (testableSkills.length === 0) {
		return { reports: [], baselineDiffs: new Map() };
	}

	// 2. Parse cases.yaml for each skill
	const suiteEntries: Array<{
		skillPath: string;
		skillName: string;
		testsDir: string;
		suite: TestSuite;
	}> = [];

	for (const skill of testableSkills) {
		const content = await readFile(skill.casesPath, "utf-8");
		const suite = await parseTestSuite(content);

		// Validate
		const errors = validateTestSuite(suite);
		if (errors.length > 0) {
			console.error(`Warning: ${skill.casesPath} has validation errors:`);
			for (const err of errors) {
				console.error(`  - ${err}`);
			}
			continue;
		}

		// Filter by type if specified
		if (options.type) {
			suite.cases = suite.cases.filter((c) => c.type === options.type);
		}

		if (suite.cases.length === 0) {
			continue;
		}

		suiteEntries.push({
			skillPath: skill.skillPath,
			skillName: basename(dirname(skill.skillPath)),
			testsDir: skill.testsDir,
			suite,
		});
	}

	// 3. Cost estimation
	const costEstimate = estimateTestCost(
		suiteEntries.map((e) => e.suite),
		options,
	);

	// 4. If --dry, return early
	if (options.dry) {
		const dryReports: TestReport[] = suiteEntries.map((entry) => ({
			skillName: entry.skillName,
			skillPath: entry.skillPath,
			suite: entry.suite.name,
			cases: entry.suite.cases.map((c) => ({
				caseId: c.id,
				type: c.type,
				prompt: c.prompt,
				trials: [],
				passed: false,
				passRate: 0,
				flaky: false,
			})),
			passed: 0,
			failed: 0,
			skipped: entry.suite.cases.length,
			totalDuration: 0,
			generatedAt: new Date().toISOString(),
		}));

		return { reports: dryReports, baselineDiffs: new Map(), costEstimate };
	}

	// 5. Resolve harness
	const harness = resolveHarness(options.agent, options.agentCmd);

	// Check if harness is available
	const available = await harness.available();
	if (!available) {
		console.error(`Warning: Agent harness "${harness.name}" is not available. Skipping tests.`);
		return { reports: [], baselineDiffs: new Map(), costEstimate };
	}

	// 6. Execute test cases
	const reports: TestReport[] = [];
	const baselineDiffs = new Map<string, BaselineDiff>();

	for (const entry of suiteEntries) {
		const start = Date.now();
		const caseResults: CaseResult[] = [];
		let skipped = 0;

		// Check budget
		if (options.maxCost && costEstimate.totalEstimatedCost > options.maxCost) {
			console.error(
				`Warning: Estimated cost $${costEstimate.totalEstimatedCost} exceeds budget $${options.maxCost}. Skipping.`,
			);
			skipped = entry.suite.cases.length;
		} else {
			for (const testCase of entry.suite.cases) {
				const result = await runCase(testCase, harness, {
					workDir: ".",
					timeout: options.timeout ?? entry.suite.timeout,
					trials: options.trials ?? entry.suite.trials,
					passThreshold: options.passThreshold ?? Math.ceil((options.trials ?? entry.suite.trials) * 0.67),
					testsDir: entry.testsDir,
					providerFlag: options.provider,
					modelFlag: options.model,
				});
				caseResults.push(result);
			}
		}

		const report: TestReport = {
			skillName: entry.skillName,
			skillPath: entry.skillPath,
			suite: entry.suite.name,
			cases: caseResults,
			passed: caseResults.filter((c) => c.passed).length,
			failed: caseResults.filter((c) => !c.passed).length,
			skipped,
			totalDuration: Date.now() - start,
			generatedAt: new Date().toISOString(),
		};

		reports.push(report);

		// 7. Baseline comparison
		const baseline = await loadBaseline(entry.skillPath);
		if (baseline) {
			const diff = compareBaseline(report, baseline);
			baselineDiffs.set(entry.skillPath, diff);
		}

		// 8. Update baseline if requested
		if (options.updateBaseline) {
			await saveBaseline(entry.skillPath, report);
		}
	}

	return { reports, baselineDiffs, costEstimate };
}

function resolveHarness(agent?: string, agentCmd?: string): AgentHarness {
	switch (agent) {
		case "claude-code":
			return new ClaudeCodeHarness();
		case "generic":
		default:
			return new GenericHarness(agentCmd);
	}
}
