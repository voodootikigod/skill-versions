import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckContext, ExtractedPackage } from "../types.js";
import { clearRegistryCache, registryChecker } from "./registry.js";

// Mock the npm module
vi.mock("../../npm.js", () => ({
	fetchLatestVersion: vi.fn(),
}));

// Mock the disk cache to avoid filesystem writes
vi.mock("../cache.js", () => ({
	getCached: vi.fn().mockResolvedValue(undefined),
	setCached: vi.fn().mockResolvedValue(undefined),
}));

// Mock global fetch for PyPI and crates.io
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { fetchLatestVersion } from "../../npm.js";

const mockedFetchLatest = vi.mocked(fetchLatestVersion);

function makeContext(packages: ExtractedPackage[]): CheckContext {
	return {
		file: { path: "test/SKILL.md", frontmatter: {}, content: "", raw: "" },
		packages,
		commands: [],
		urls: [],
	};
}

function pkg(name: string, ecosystem: "npm" | "pypi" | "crates", line = 1): ExtractedPackage {
	return { name, ecosystem, line, source: `install ${name}` };
}

describe("registryChecker", () => {
	beforeEach(() => {
		clearRegistryCache();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("reports hallucinated npm packages", async () => {
		mockedFetchLatest.mockRejectedValue(new Error("not found"));
		const ctx = makeContext([pkg("nonexistent-pkg-xyz", "npm")]);
		const findings = await registryChecker.check(ctx);
		expect(findings).toHaveLength(1);
		expect(findings[0].severity).toBe("critical");
		expect(findings[0].category).toBe("hallucinated-package");
		expect(findings[0].message).toContain("nonexistent-pkg-xyz");
	});

	it("passes for existing npm packages", async () => {
		mockedFetchLatest.mockResolvedValue("4.18.0");
		const ctx = makeContext([pkg("express", "npm")]);
		const findings = await registryChecker.check(ctx);
		expect(findings).toHaveLength(0);
	});

	it("reports hallucinated PyPI packages", async () => {
		mockFetch.mockResolvedValue({ ok: false, status: 404 });
		const ctx = makeContext([pkg("nonexistent-python-pkg", "pypi")]);
		const findings = await registryChecker.check(ctx);
		expect(findings).toHaveLength(1);
		expect(findings[0].severity).toBe("critical");
		expect(findings[0].message).toContain("nonexistent-python-pkg");
	});

	it("passes for existing PyPI packages", async () => {
		mockFetch.mockResolvedValue({ ok: true });
		const ctx = makeContext([pkg("requests", "pypi")]);
		const findings = await registryChecker.check(ctx);
		expect(findings).toHaveLength(0);
	});

	it("reports hallucinated crates", async () => {
		mockFetch.mockResolvedValue({ ok: false, status: 404 });
		const ctx = makeContext([pkg("nonexistent-crate", "crates")]);
		const findings = await registryChecker.check(ctx);
		expect(findings).toHaveLength(1);
		expect(findings[0].message).toContain("nonexistent-crate");
	});

	it("passes for existing crates", async () => {
		mockFetch.mockResolvedValue({ ok: true });
		const ctx = makeContext([pkg("serde", "crates")]);
		const findings = await registryChecker.check(ctx);
		expect(findings).toHaveLength(0);
	});

	it("deduplicates packages before checking", async () => {
		mockedFetchLatest.mockResolvedValue("1.0.0");
		const ctx = makeContext([
			pkg("express", "npm", 1),
			pkg("express", "npm", 5),
			pkg("express", "npm", 10),
		]);
		const findings = await registryChecker.check(ctx);
		expect(findings).toHaveLength(0);
		// Should only call fetchLatestVersion once due to dedup
		expect(mockedFetchLatest).toHaveBeenCalledTimes(1);
	});

	it("reports all occurrences when package is hallucinated", async () => {
		mockedFetchLatest.mockRejectedValue(new Error("not found"));
		const ctx = makeContext([pkg("bad-pkg", "npm", 3), pkg("bad-pkg", "npm", 7)]);
		const findings = await registryChecker.check(ctx);
		expect(findings).toHaveLength(2);
		expect(findings[0].line).toBe(3);
		expect(findings[1].line).toBe(7);
	});

	it("uses cache for repeated checks", async () => {
		mockedFetchLatest.mockResolvedValue("1.0.0");

		const ctx1 = makeContext([pkg("cached-pkg", "npm")]);
		await registryChecker.check(ctx1);

		const ctx2 = makeContext([pkg("cached-pkg", "npm")]);
		await registryChecker.check(ctx2);

		// Only called once thanks to cache
		expect(mockedFetchLatest).toHaveBeenCalledTimes(1);
	});
});
