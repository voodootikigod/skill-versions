import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the LLM providers to simulate no provider available (graceful degradation)
vi.mock("../../llm/providers.js", () => ({
	resolveModel: vi.fn().mockRejectedValue(new Error("No LLM provider")),
}));

import { gradeLlmRubric } from "./llm-rubric.js";

describe("gradeLlmRubric", () => {
	let workDir: string;

	beforeEach(async () => {
		workDir = join(tmpdir(), `skills-check-test-llm-${Date.now()}`);
		await mkdir(workDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(workDir, { recursive: true, force: true });
		vi.restoreAllMocks();
	});

	it("gracefully degrades when no LLM provider is available", async () => {
		await writeFile(join(workDir, "test.ts"), "const x = 1;");

		const result = await gradeLlmRubric(
			workDir,
			["Uses TypeScript", "Has proper types"],
			undefined,
			"Create a typed module"
		);

		// Should not throw, should return a skip result
		expect(result.grader).toBe("llm-rubric");
		expect(result.passed).toBe(true); // Skipped counts as pass (not penalized)
		expect(result.detail).toContain("Skipped");
	});

	it("includes criteria count in skip message", async () => {
		const result = await gradeLlmRubric(workDir, ["A", "B", "C"]);
		expect(result.message).toContain("3");
	});
});
