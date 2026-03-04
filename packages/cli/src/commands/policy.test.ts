import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PolicyReport } from "../policy/types.js";

// Mock the policy orchestrator
vi.mock("../policy/index.js", () => ({
	runPolicyCheck: vi.fn(),
}));

// Mock the parser to avoid filesystem
vi.mock("../policy/parser.js", async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		loadPolicyFile: vi.fn(),
		discoverPolicyFile: vi.fn(),
	};
});

import { runPolicyCheck } from "../policy/index.js";
import { discoverPolicyFile, loadPolicyFile } from "../policy/parser.js";
import { policyCheckCommand, policyInitCommand, policyValidateCommand } from "./policy.js";

const mockedRunPolicyCheck = vi.mocked(runPolicyCheck);
const mockedLoadPolicyFile = vi.mocked(loadPolicyFile);
const mockedDiscoverPolicyFile = vi.mocked(discoverPolicyFile);

function makeReport(overrides?: Partial<PolicyReport>): PolicyReport {
	return {
		policyFile: ".skill-policy.yml",
		files: 1,
		findings: [],
		required: [],
		summary: { blocked: 0, violations: 0, warnings: 0 },
		generatedAt: "2026-03-03T00:00:00.000Z",
		...overrides,
	};
}

describe("policyCheckCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedDiscoverPolicyFile.mockResolvedValue("/project/.skill-policy.yml");
		mockedLoadPolicyFile.mockResolvedValue({ version: 1 });
		mockedRunPolicyCheck.mockResolvedValue(makeReport());
		vi.spyOn(console, "log").mockImplementation(() => {
			/* intentionally empty */
		});
		vi.spyOn(console, "error").mockImplementation(() => {
			/* intentionally empty */
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns 0 for clean report", async () => {
		const code = await policyCheckCommand(".", {});
		expect(code).toBe(0);
	});

	it("returns 1 when blocked findings exist", async () => {
		mockedRunPolicyCheck.mockResolvedValue(
			makeReport({
				findings: [
					{
						file: "test.md",
						severity: "blocked",
						rule: "sources.deny",
						message: "Denied",
					},
				],
				summary: { blocked: 1, violations: 0, warnings: 0 },
			})
		);
		const code = await policyCheckCommand(".", {});
		expect(code).toBe(1);
	});

	it("returns 0 when findings are below threshold", async () => {
		mockedRunPolicyCheck.mockResolvedValue(
			makeReport({
				findings: [
					{
						file: "test.md",
						severity: "warning",
						rule: "freshness",
						message: "Old skill",
					},
				],
				summary: { blocked: 0, violations: 0, warnings: 1 },
			})
		);
		// Default threshold is "blocked", warning doesn't trigger exit 1
		const code = await policyCheckCommand(".", {});
		expect(code).toBe(0);
	});

	it("returns 2 for invalid --fail-on value", async () => {
		const code = await policyCheckCommand(".", { failOn: "banana" });
		expect(code).toBe(2);
	});

	it("returns 2 when no policy file found", async () => {
		mockedDiscoverPolicyFile.mockResolvedValue(null);
		const code = await policyCheckCommand(".", {});
		expect(code).toBe(2);
	});

	it("respects --fail-on threshold", async () => {
		mockedRunPolicyCheck.mockResolvedValue(
			makeReport({
				findings: [
					{
						file: "test.md",
						severity: "violation",
						rule: "content",
						message: "Bad pattern",
					},
				],
				summary: { blocked: 0, violations: 1, warnings: 0 },
			})
		);
		const code = await policyCheckCommand(".", { failOn: "violation" });
		expect(code).toBe(1);
	});

	it("uses specified policy path", async () => {
		await policyCheckCommand(".", { policy: "/custom/policy.yml" });
		expect(mockedLoadPolicyFile).toHaveBeenCalledWith("/custom/policy.yml");
	});

	it("outputs json format", async () => {
		const logSpy = vi.mocked(console.log);
		await policyCheckCommand(".", { format: "json" });
		expect(logSpy).toHaveBeenCalled();
		const output = logSpy.mock.calls[0][0] as string;
		const parsed = JSON.parse(output);
		expect(parsed.policyFile).toBe(".skill-policy.yml");
	});

	it("writes report to file with --output", async () => {
		const outPath = join(tmpdir(), `policy-test-${Date.now()}.json`);
		await policyCheckCommand(".", { format: "json", output: outPath });

		const content = await readFile(outPath, "utf-8");
		const parsed = JSON.parse(content);
		expect(parsed.policyFile).toBe(".skill-policy.yml");

		await rm(outPath, { force: true });
	});
});

describe("policyInitCommand", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => {
			/* intentionally empty */
		});
		vi.spyOn(console, "error").mockImplementation(() => {
			/* intentionally empty */
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("creates a policy file", async () => {
		const outPath = join(tmpdir(), `policy-init-${Date.now()}.yml`);
		const code = await policyInitCommand({ output: outPath });
		expect(code).toBe(0);

		const content = await readFile(outPath, "utf-8");
		expect(content).toContain("version: 1");

		await rm(outPath, { force: true });
	});
});

describe("policyValidateCommand", () => {
	let tempFile: string;

	beforeEach(async () => {
		vi.clearAllMocks();
		// Use the real loadPolicyFile for validate tests
		const realParser =
			await vi.importActual<typeof import("../policy/parser.js")>("../policy/parser.js");
		mockedLoadPolicyFile.mockImplementation(realParser.loadPolicyFile);
		vi.spyOn(console, "log").mockImplementation(() => {
			/* intentionally empty */
		});
		vi.spyOn(console, "error").mockImplementation(() => {
			/* intentionally empty */
		});
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		if (tempFile) {
			await rm(tempFile, { force: true });
		}
	});

	it("returns 0 for valid policy", async () => {
		tempFile = join(tmpdir(), `policy-validate-${Date.now()}.yml`);
		await writeFile(tempFile, "version: 1\n");
		const code = await policyValidateCommand({ policy: tempFile });
		expect(code).toBe(0);
	});

	it("returns 1 for invalid policy (missing version)", async () => {
		tempFile = join(tmpdir(), `policy-validate-${Date.now()}.yml`);
		await writeFile(tempFile, "sources:\n  allow: []\n");
		const code = await policyValidateCommand({ policy: tempFile });
		expect(code).toBe(1);
	});
});
