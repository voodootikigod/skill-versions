import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies to avoid filesystem/network
vi.mock("../npm.js", () => ({
	fetchLatestVersions: vi.fn(),
}));

vi.mock("../registry.js", () => ({
	loadRegistry: vi.fn(),
}));

import { fetchLatestVersions } from "../npm.js";
import { loadRegistry } from "../registry.js";
import type { Registry } from "../types.js";
import { checkCommand } from "./check.js";

const mockedLoadRegistry = vi.mocked(loadRegistry);
const mockedFetchLatestVersions = vi.mocked(fetchLatestVersions);

function makeRegistry(overrides?: Partial<Registry>): Registry {
	return {
		$schema: "https://skillscheck.ai/schema.json",
		version: 1,
		lastCheck: "2026-01-01T00:00:00.000Z",
		products: {
			nextjs: {
				displayName: "Next.js",
				package: "next",
				verifiedVersion: "14.0.0",
				verifiedAt: "2026-01-01T00:00:00.000Z",
				skills: ["nextjs-routing"],
			},
		},
		...overrides,
	};
}

describe("checkCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedLoadRegistry.mockResolvedValue(makeRegistry());
		mockedFetchLatestVersions.mockResolvedValue(new Map([["next", "15.0.0"]]));
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

	it("returns 0 when all products are current", async () => {
		mockedFetchLatestVersions.mockResolvedValue(new Map([["next", "14.0.0"]]));
		const code = await checkCommand({});
		expect(code).toBe(0);
	});

	it("returns 0 for stale products without --ci", async () => {
		const code = await checkCommand({});
		expect(code).toBe(0);
	});

	it("returns 1 for stale products with --ci", async () => {
		const code = await checkCommand({ ci: true });
		expect(code).toBe(1);
	});

	it("outputs JSON when --json is set", async () => {
		const logSpy = vi.mocked(console.log);
		await checkCommand({ json: true });
		expect(logSpy).toHaveBeenCalled();
		const output = logSpy.mock.calls[0][0] as string;
		const parsed = JSON.parse(output);
		expect(parsed).toBeInstanceOf(Array);
		expect(parsed[0].product).toBe("nextjs");
		expect(parsed[0].stale).toBe(true);
	});

	it("returns 1 with --json and --ci when stale", async () => {
		const code = await checkCommand({ json: true, ci: true });
		expect(code).toBe(1);
	});

	it("returns 0 with --json and --ci when current", async () => {
		mockedFetchLatestVersions.mockResolvedValue(new Map([["next", "14.0.0"]]));
		const code = await checkCommand({ json: true, ci: true });
		expect(code).toBe(0);
	});

	it("returns 2 when product not found", async () => {
		const code = await checkCommand({ product: "nonexistent" });
		expect(code).toBe(2);
	});

	it("filters to single product with --product", async () => {
		const code = await checkCommand({ product: "nextjs" });
		expect(code).toBe(0);
	});

	it("handles fetch errors gracefully", async () => {
		mockedFetchLatestVersions.mockResolvedValue(
			new Map<string, string | Error>([["next", new Error("Network error")]])
		);
		const code = await checkCommand({});
		expect(code).toBe(0);
		expect(console.error).toHaveBeenCalled();
	});

	it("handles missing version data gracefully", async () => {
		mockedFetchLatestVersions.mockResolvedValue(new Map());
		const code = await checkCommand({});
		expect(code).toBe(0);
		expect(console.error).toHaveBeenCalled();
	});

	it("warns on coerced version", async () => {
		mockedLoadRegistry.mockResolvedValue(
			makeRegistry({
				products: {
					nextjs: {
						displayName: "Next.js",
						package: "next",
						verifiedVersion: "v14-beta",
						verifiedAt: "2026-01-01T00:00:00.000Z",
						skills: ["nextjs-routing"],
					},
				},
			})
		);
		await checkCommand({});
		const errorCalls = vi.mocked(console.error).mock.calls.map((c) => String(c[0]));
		expect(errorCalls.some((c) => c.includes("coerced"))).toBe(true);
	});

	it("shows current products with --verbose", async () => {
		mockedFetchLatestVersions.mockResolvedValue(new Map([["next", "14.0.0"]]));
		await checkCommand({ verbose: true });
		const logCalls = vi.mocked(console.log).mock.calls.map((c) => String(c[0]));
		expect(logCalls.some((c) => c.includes("CURRENT"))).toBe(true);
	});

	it("loads custom registry path", async () => {
		await checkCommand({ registry: "custom.json" });
		expect(mockedLoadRegistry).toHaveBeenCalledWith("custom.json");
	});

	it("classifies severity correctly", async () => {
		const logSpy = vi.mocked(console.log);
		await checkCommand({ json: true });
		const output = logSpy.mock.calls[0][0] as string;
		const parsed = JSON.parse(output);
		expect(parsed[0].severity).toBe("major");
	});
});
