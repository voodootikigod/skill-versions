import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock homedir to use temp directory
let tempDir: string;

vi.mock("node:os", async () => {
	const actual = await vi.importActual("node:os");
	return {
		...actual,
		homedir: () => tempDir,
	};
});

// Import after mocking
const { getCached, setCached, resetCacheState } = await import("./cache.js");

describe("cache", () => {
	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "cache-test-"));
		resetCacheState();
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it("returns undefined for cache miss", async () => {
		const result = await getCached("npm", "nonexistent");
		expect(result).toBeUndefined();
	});

	it("stores and retrieves cache entries", async () => {
		await setCached("npm", "express", true);
		const result = await getCached("npm", "express");
		expect(result).toBe(true);
	});

	it("stores false values", async () => {
		await setCached("npm", "bad-pkg", false);
		const result = await getCached("npm", "bad-pkg");
		expect(result).toBe(false);
	});

	it("handles scoped package names", async () => {
		await setCached("npm", "@scope/pkg", true);
		const result = await getCached("npm", "@scope/pkg");
		expect(result).toBe(true);
	});

	it("returns undefined for expired entries", async () => {
		await setCached("npm", "expired", true);
		// Check with 0ms TTL — should be expired
		const result = await getCached("npm", "expired", 0);
		expect(result).toBeUndefined();
	});

	it("separates ecosystems", async () => {
		await setCached("npm", "pkg", true);
		await setCached("pypi", "pkg", false);

		expect(await getCached("npm", "pkg")).toBe(true);
		expect(await getCached("pypi", "pkg")).toBe(false);
	});
});
