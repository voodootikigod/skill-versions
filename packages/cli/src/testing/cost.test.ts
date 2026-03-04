import { describe, expect, it } from "vitest";
import { estimateTestCost } from "./cost.js";
import type { TestSuite } from "./types.js";

describe("estimateTestCost", () => {
	it("estimates zero for empty suite list", () => {
		const estimate = estimateTestCost([], {});
		expect(estimate.totalEstimatedCost).toBe(0);
		expect(estimate.perSuite).toHaveLength(0);
	});

	it("estimates lower cost for trigger tests", () => {
		const triggerSuite: TestSuite = {
			name: "trigger-only",
			timeout: 60,
			trials: 3,
			cases: [
				{
					id: "t1",
					type: "trigger",
					prompt: "test",
					expectTrigger: true,
					graders: [],
				},
			],
		};

		const outcomeSuite: TestSuite = {
			name: "outcome-only",
			timeout: 60,
			trials: 3,
			cases: [
				{
					id: "o1",
					type: "outcome",
					prompt: "test",
					graders: [],
				},
			],
		};

		const triggerEstimate = estimateTestCost([triggerSuite], {});
		const outcomeEstimate = estimateTestCost([outcomeSuite], {});

		expect(triggerEstimate.totalEstimatedCost).toBeLessThan(outcomeEstimate.totalEstimatedCost);
	});

	it("increases cost with llm-rubric graders", () => {
		const withoutRubric: TestSuite = {
			name: "no-rubric",
			timeout: 60,
			trials: 3,
			cases: [
				{
					id: "o1",
					type: "outcome",
					prompt: "test",
					graders: [{ type: "file-exists", paths: ["test.ts"] }],
				},
			],
		};

		const withRubric: TestSuite = {
			name: "with-rubric",
			timeout: 60,
			trials: 3,
			cases: [
				{
					id: "o1",
					type: "outcome",
					prompt: "test",
					graders: [
						{ type: "file-exists", paths: ["test.ts"] },
						{ type: "llm-rubric", criteria: ["Is good code"] },
					],
				},
			],
		};

		const noRubricEstimate = estimateTestCost([withoutRubric], {});
		const rubricEstimate = estimateTestCost([withRubric], {});

		expect(rubricEstimate.totalEstimatedCost).toBeGreaterThan(noRubricEstimate.totalEstimatedCost);
	});

	it("respects trial override from options", () => {
		const suite: TestSuite = {
			name: "test",
			timeout: 60,
			trials: 3,
			cases: [{ id: "o1", type: "outcome", prompt: "test", graders: [] }],
		};

		const defaultEstimate = estimateTestCost([suite], {});
		const overrideEstimate = estimateTestCost([suite], { trials: 10 });

		expect(overrideEstimate.totalEstimatedCost).toBeGreaterThan(defaultEstimate.totalEstimatedCost);
	});

	it("includes per-suite breakdown", () => {
		const suites: TestSuite[] = [
			{
				name: "suite-a",
				timeout: 60,
				trials: 2,
				cases: [
					{ id: "a1", type: "outcome", prompt: "test", graders: [] },
					{ id: "a2", type: "outcome", prompt: "test", graders: [] },
				],
			},
			{
				name: "suite-b",
				timeout: 60,
				trials: 3,
				cases: [{ id: "b1", type: "trigger", prompt: "test", expectTrigger: true, graders: [] }],
			},
		];

		const estimate = estimateTestCost(suites, {});
		expect(estimate.perSuite).toHaveLength(2);
		expect(estimate.perSuite[0].suiteName).toBe("suite-a");
		expect(estimate.perSuite[0].caseCount).toBe(2);
		expect(estimate.perSuite[1].suiteName).toBe("suite-b");
	});
});
