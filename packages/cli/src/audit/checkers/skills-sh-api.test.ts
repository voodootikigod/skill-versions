import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckContext } from "../types.js";

// Mock cache module
vi.mock("../cache.js", () => ({
	getJsonCached: vi.fn().mockResolvedValue(undefined),
	setJsonCached: vi.fn().mockResolvedValue(undefined),
}));

import { getJsonCached, setJsonCached } from "../cache.js";
import { fetchRegistryAudit } from "./skills-sh-api.js";

const mockedGetJsonCached = vi.mocked(getJsonCached);
const mockedSetJsonCached = vi.mocked(setJsonCached);

function makeContext(frontmatter: Record<string, unknown> = { name: "test-skill" }): CheckContext {
	return {
		file: {
			path: "test/SKILL.md",
			frontmatter,
			content: "# Test",
			raw: "---\nname: test-skill\n---\n# Test",
		},
		packages: [],
		commands: [],
		urls: [],
	};
}

describe("fetchRegistryAudit", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockedGetJsonCached.mockResolvedValue(undefined);
		mockedSetJsonCached.mockResolvedValue(undefined);
		vi.spyOn(console, "warn").mockImplementation(() => {
			/* intentionally empty */
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns null when no skill name in frontmatter", async () => {
		const ctx = makeContext({});
		const result = await fetchRegistryAudit(ctx);
		expect(result.findings).toHaveLength(0);
		expect(result.registryAudit).toBeNull();
	});

	it("parses successful API response into findings and registryAudit", async () => {
		const apiResponse = {
			audits: [
				{
					auditor: "snyk",
					status: "alert",
					riskLevel: "high",
					alertCount: 3,
					details: "Found injection patterns",
				},
				{
					auditor: "socket",
					status: "safe",
					riskLevel: "none",
					alertCount: 0,
				},
			],
		};

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: () => Promise.resolve(apiResponse),
			})
		);

		const ctx = makeContext();
		const result = await fetchRegistryAudit(ctx);

		expect(result.registryAudit).not.toBeNull();
		expect(result.registryAudit?.skillName).toBe("test-skill");
		expect(result.registryAudit?.entries).toHaveLength(2);

		// Only the non-safe entry should produce a finding
		expect(result.findings).toHaveLength(1);
		expect(result.findings[0].category).toBe("registry-audit");
		expect(result.findings[0].severity).toBe("critical");
		expect(result.findings[0].message).toContain("snyk");

		// Should cache the response
		expect(mockedSetJsonCached).toHaveBeenCalledWith("skills-sh", "test-skill", apiResponse);

		vi.unstubAllGlobals();
	});

	it("returns null on network error and warns", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

		const ctx = makeContext();
		const result = await fetchRegistryAudit(ctx);

		expect(result.findings).toHaveLength(0);
		expect(result.registryAudit).toBeNull();
		expect(console.warn).toHaveBeenCalled();

		vi.unstubAllGlobals();
	});

	it("returns null on 404 response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
			})
		);

		const ctx = makeContext();
		const result = await fetchRegistryAudit(ctx);

		expect(result.findings).toHaveLength(0);
		expect(result.registryAudit).toBeNull();

		vi.unstubAllGlobals();
	});

	it("handles unknown response format gracefully", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ unexpected: "data" }),
			})
		);

		const ctx = makeContext();
		const result = await fetchRegistryAudit(ctx);

		// Should still return a valid result with empty entries
		expect(result.registryAudit).not.toBeNull();
		expect(result.registryAudit?.entries).toHaveLength(0);
		expect(result.findings).toHaveLength(0);

		vi.unstubAllGlobals();
	});

	it("uses cached data when available", async () => {
		const cachedData = {
			audits: [{ auditor: "gen", status: "clean", riskLevel: "none", alertCount: 0 }],
		};
		mockedGetJsonCached.mockResolvedValue(cachedData);

		const fetchSpy = vi.fn();
		vi.stubGlobal("fetch", fetchSpy);

		const ctx = makeContext();
		const result = await fetchRegistryAudit(ctx);

		expect(result.registryAudit).not.toBeNull();
		expect(result.registryAudit?.entries).toHaveLength(1);
		expect(result.registryAudit?.entries[0].auditor).toBe("gen");

		// Should not have called fetch since cache hit
		expect(fetchSpy).not.toHaveBeenCalled();

		vi.unstubAllGlobals();
	});

	it("maps risk levels to correct severities", async () => {
		const apiResponse = {
			audits: [
				{ auditor: "snyk", status: "alert", riskLevel: "critical" },
				{ auditor: "socket", status: "warning", riskLevel: "medium" },
				{ auditor: "gen", status: "info", riskLevel: "low" },
			],
		};

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: () => Promise.resolve(apiResponse),
			})
		);

		const ctx = makeContext();
		const result = await fetchRegistryAudit(ctx);

		expect(result.findings).toHaveLength(3);
		expect(result.findings[0].severity).toBe("critical"); // critical → critical
		expect(result.findings[1].severity).toBe("high"); // medium → high
		expect(result.findings[2].severity).toBe("low"); // low → low

		vi.unstubAllGlobals();
	});

	it("uses repository as fallback for skill name", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ audits: [] }),
			})
		);

		const ctx = makeContext({ repository: "my-repo/skill" });
		const result = await fetchRegistryAudit(ctx);

		expect(result.registryAudit).not.toBeNull();
		expect(result.registryAudit?.skillName).toBe("my-repo/skill");

		vi.unstubAllGlobals();
	});
});
