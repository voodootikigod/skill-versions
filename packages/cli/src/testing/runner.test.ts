import { describe, expect, it, vi } from "vitest";

// Mock graders to avoid filesystem operations
vi.mock("./graders/file-exists.js", () => ({
	gradeFileExists: vi.fn().mockResolvedValue({
		grader: "file-exists",
		passed: true,
		message: "All files exist",
	}),
}));

vi.mock("./graders/command.js", () => ({
	gradeCommand: vi.fn().mockResolvedValue({
		grader: "command",
		passed: true,
		message: "Command passed",
	}),
}));

vi.mock("./graders/contains.js", () => ({
	gradeContains: vi.fn().mockResolvedValue({
		grader: "contains",
		passed: true,
		message: "Patterns found",
	}),
}));

vi.mock("./graders/json-match.js", () => ({
	gradeJsonMatch: vi.fn().mockResolvedValue({
		grader: "json-match",
		passed: true,
		message: "JSON matches",
	}),
}));

vi.mock("./graders/package-has.js", () => ({
	gradePackageHas: vi.fn().mockResolvedValue({
		grader: "package-has",
		passed: true,
		message: "Dependencies found",
	}),
}));

vi.mock("./graders/llm-rubric.js", () => ({
	gradeLlmRubric: vi.fn().mockResolvedValue({
		grader: "llm-rubric",
		passed: true,
		message: "Criteria passed",
	}),
}));

vi.mock("./graders/custom.js", () => ({
	gradeCustom: vi.fn().mockResolvedValue({
		grader: "custom",
		passed: true,
		message: "Custom check passed",
	}),
}));

import { gradeFileExists } from "./graders/file-exists.js";
import { MockHarness } from "./harness/mock.js";
import { runCase } from "./runner.js";
import type { TestCase } from "./types.js";

describe("runCase", () => {
	it("runs a basic test case with a single trial", async () => {
		const harness = new MockHarness({ exitCode: 0, transcript: "done", filesCreated: [] });

		const testCase: TestCase = {
			id: "basic",
			type: "outcome",
			prompt: "Create a file",
			graders: [{ type: "file-exists", paths: ["test.ts"] }],
		};

		const result = await runCase(testCase, harness, {
			workDir: ".",
			timeout: 10,
			trials: 1,
			passThreshold: 1,
		});

		expect(result.caseId).toBe("basic");
		expect(result.trials).toHaveLength(1);
		expect(result.passed).toBe(true);
		expect(result.passRate).toBe(1);
		expect(result.flaky).toBe(false);
	});

	it("respects pass threshold (2 of 3)", async () => {
		const harness = new MockHarness();
		const mockedGrade = vi.mocked(gradeFileExists);

		// First two trials pass, third fails
		let callCount = 0;
		mockedGrade.mockImplementation(async () => {
			callCount++;
			return {
				grader: "file-exists",
				passed: callCount <= 2,
				message: callCount <= 2 ? "exists" : "missing",
			};
		});

		const testCase: TestCase = {
			id: "threshold-test",
			type: "outcome",
			prompt: "test",
			graders: [{ type: "file-exists", paths: ["test.ts"] }],
		};

		const result = await runCase(testCase, harness, {
			workDir: ".",
			timeout: 10,
			trials: 3,
			passThreshold: 2,
		});

		expect(result.trials).toHaveLength(3);
		expect(result.passed).toBe(true);
		expect(result.passRate).toBeCloseTo(0.667, 1);
		expect(result.flaky).toBe(true);
	});

	it("fails when threshold not met", async () => {
		const harness = new MockHarness();
		const mockedGrade = vi.mocked(gradeFileExists);

		mockedGrade.mockResolvedValue({
			grader: "file-exists",
			passed: false,
			message: "missing",
		});

		const testCase: TestCase = {
			id: "fail-test",
			type: "outcome",
			prompt: "test",
			graders: [{ type: "file-exists", paths: ["test.ts"] }],
		};

		const result = await runCase(testCase, harness, {
			workDir: ".",
			timeout: 10,
			trials: 3,
			passThreshold: 2,
		});

		expect(result.passed).toBe(false);
		expect(result.passRate).toBe(0);
		expect(result.flaky).toBe(false);
	});

	it("detects flaky tests", async () => {
		const harness = new MockHarness();
		const mockedGrade = vi.mocked(gradeFileExists);

		let callCount = 0;
		mockedGrade.mockImplementation(async () => {
			callCount++;
			return {
				grader: "file-exists",
				passed: callCount === 1, // Only first trial passes
				message: callCount === 1 ? "exists" : "missing",
			};
		});

		const testCase: TestCase = {
			id: "flaky-test",
			type: "outcome",
			prompt: "test",
			graders: [{ type: "file-exists", paths: ["test.ts"] }],
		};

		const result = await runCase(testCase, harness, {
			workDir: ".",
			timeout: 10,
			trials: 3,
			passThreshold: 2,
		});

		expect(result.flaky).toBe(true);
		expect(result.passed).toBe(false); // 1/3 < threshold of 2
	});

	it("records execution in mock harness", async () => {
		const harness = new MockHarness();

		const testCase: TestCase = {
			id: "log-test",
			type: "outcome",
			prompt: "Do something",
			graders: [],
		};

		await runCase(testCase, harness, {
			workDir: ".",
			timeout: 30,
			trials: 1,
			passThreshold: 1,
		});

		expect(harness.executionLog).toHaveLength(1);
		expect(harness.executionLog[0].prompt).toBe("Do something");
	});
});
