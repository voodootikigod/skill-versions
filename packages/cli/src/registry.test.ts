import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadRegistry, saveRegistry } from "./registry.js";

describe("loadRegistry", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "sv-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it("loads a valid registry file", async () => {
		const registry = {
			version: 1,
			products: {
				test: {
					displayName: "Test",
					package: "test-pkg",
					verifiedVersion: "1.0.0",
					verifiedAt: "2026-01-01T00:00:00Z",
					skills: ["test-skill"],
				},
			},
		};

		const filePath = join(tempDir, "registry.json");
		await writeFile(filePath, JSON.stringify(registry));

		const loaded = await loadRegistry(filePath);
		expect(loaded.version).toBe(1);
		expect(loaded.products.test.displayName).toBe("Test");
	});

	it("throws for missing file", async () => {
		await expect(loadRegistry(join(tempDir, "missing.json"))).rejects.toThrow(
			"Registry file not found"
		);
	});

	it("throws for invalid JSON", async () => {
		const filePath = join(tempDir, "bad.json");
		await writeFile(filePath, "not json");

		await expect(loadRegistry(filePath)).rejects.toThrow("Invalid JSON");
	});

	it("throws for wrong version", async () => {
		const filePath = join(tempDir, "v2.json");
		await writeFile(filePath, JSON.stringify({ version: 2, products: {} }));

		await expect(loadRegistry(filePath)).rejects.toThrow("Unsupported registry version");
	});

	it("throws for missing required product fields", async () => {
		const filePath = join(tempDir, "incomplete.json");
		await writeFile(
			filePath,
			JSON.stringify({
				version: 1,
				products: { bad: { displayName: "Bad" } },
			})
		);

		await expect(loadRegistry(filePath)).rejects.toThrow("missing required field");
	});

	it("throws when skills is not an array", async () => {
		const filePath = join(tempDir, "bad-skills.json");
		await writeFile(
			filePath,
			JSON.stringify({
				version: 1,
				products: {
					test: {
						displayName: "Test",
						package: "test",
						verifiedVersion: "1.0.0",
						verifiedAt: "2026-01-01T00:00:00Z",
						skills: "not-an-array",
					},
				},
			})
		);

		await expect(loadRegistry(filePath)).rejects.toThrow("skills must be an array");
	});
});

describe("saveRegistry", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "sv-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true });
	});

	it("writes and round-trips a registry", async () => {
		const registry = {
			version: 1 as const,
			products: {
				test: {
					displayName: "Test",
					package: "test-pkg",
					verifiedVersion: "1.0.0",
					verifiedAt: "2026-01-01T00:00:00Z",
					skills: ["a", "b"],
				},
			},
		};

		const filePath = join(tempDir, "out.json");
		const saved = await saveRegistry(registry, filePath);
		expect(saved).toBe(filePath);

		const loaded = await loadRegistry(filePath);
		expect(loaded.products.test.skills).toEqual(["a", "b"]);
	});
});
