import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../policy/parser.js", () => ({
	discoverPolicyFile: vi.fn(),
	loadPolicyFile: vi.fn(),
}));

import { discoverPolicyFile, loadPolicyFile } from "../policy/parser.js";
import type { UsageReport } from "./analyzer.js";
import { checkUsagePolicy } from "./policy-check.js";

const mockDiscover = vi.mocked(discoverPolicyFile);
const mockLoad = vi.mocked(loadPolicyFile);

function makeReport(skills: UsageReport["skills"] = []): UsageReport {
	return {
		period: {},
		totalCalls: skills.reduce((s, sk) => s + sk.totalCalls, 0),
		totalTokens: 0,
		totalEstimatedCost: 0,
		skills,
		generatedAt: "2026-03-07T12:00:00Z",
	};
}

describe("checkUsagePolicy", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns empty array when no policy file found", async () => {
		mockDiscover.mockResolvedValue(null);
		const report = makeReport([
			{
				name: "react",
				versions: ["19.1.0"],
				totalCalls: 100,
				totalTokens: 1000,
				avgTokensPerCall: 10,
				estimatedCost: 0.01,
				models: {},
				hasVersionDrift: false,
			},
		]);

		const violations = await checkUsagePolicy(report);
		expect(violations).toHaveLength(0);
	});

	it("detects banned skill in usage", async () => {
		mockDiscover.mockResolvedValue("/path/.skill-policy.yml");
		mockLoad.mockResolvedValue({
			version: 1,
			banned: [{ skill: "malicious-skill", reason: "known malware" }],
		});

		const report = makeReport([
			{
				name: "malicious-skill",
				versions: ["1.0.0"],
				totalCalls: 50,
				totalTokens: 500,
				avgTokensPerCall: 10,
				estimatedCost: 0,
				models: {},
				hasVersionDrift: false,
			},
		]);

		const violations = await checkUsagePolicy(report);
		expect(violations).toHaveLength(1);
		expect(violations[0].severity).toBe("critical");
		expect(violations[0].rule).toBe("banned");
		expect(violations[0].callCount).toBe(50);
	});

	it("detects denied source in usage", async () => {
		mockDiscover.mockResolvedValue("/path/.skill-policy.yml");
		mockLoad.mockResolvedValue({
			version: 1,
			sources: { deny: ["untrusted"] },
		});

		const report = makeReport([
			{
				name: "untrusted-react",
				versions: ["1.0.0"],
				totalCalls: 10,
				totalTokens: 100,
				avgTokensPerCall: 10,
				estimatedCost: 0,
				models: {},
				hasVersionDrift: false,
			},
		]);

		const violations = await checkUsagePolicy(report);
		expect(violations).toHaveLength(1);
		expect(violations[0].severity).toBe("high");
		expect(violations[0].rule).toBe("source-denied");
	});

	it("returns no violations for clean usage", async () => {
		mockDiscover.mockResolvedValue("/path/.skill-policy.yml");
		mockLoad.mockResolvedValue({
			version: 1,
			banned: [{ skill: "malicious" }],
			sources: { deny: ["evil"] },
		});

		const report = makeReport([
			{
				name: "react",
				versions: ["19.1.0"],
				totalCalls: 100,
				totalTokens: 1000,
				avgTokensPerCall: 10,
				estimatedCost: 0.01,
				models: {},
				hasVersionDrift: false,
			},
		]);

		const violations = await checkUsagePolicy(report);
		expect(violations).toHaveLength(0);
	});
});
