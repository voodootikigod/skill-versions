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
import { reportCommand } from "./report.js";

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
			react: {
				displayName: "React",
				package: "react",
				verifiedVersion: "18.2.0",
				verifiedAt: "2026-01-01T00:00:00.000Z",
				skills: ["react-basics"],
			},
		},
		...overrides,
	};
}

describe("reportCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedLoadRegistry.mockResolvedValue(makeRegistry());
		mockedFetchLatestVersions.mockResolvedValue(
			new Map([
				["next", "15.0.0"],
				["react", "18.2.0"],
			])
		);
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

	it("returns 0 always", async () => {
		const code = await reportCommand({});
		expect(code).toBe(0);
	});

	it("generates markdown by default", async () => {
		const logSpy = vi.mocked(console.log);
		await reportCommand({});
		const output = logSpy.mock.calls[0][0] as string;
		expect(output).toContain("# Skills Check Report");
		expect(output).toContain("## Summary");
	});

	it("includes stale products in markdown", async () => {
		const logSpy = vi.mocked(console.log);
		await reportCommand({});
		const output = logSpy.mock.calls[0][0] as string;
		expect(output).toContain("## Stale Products");
		expect(output).toContain("Next.js");
		expect(output).toContain("14.0.0");
		expect(output).toContain("15.0.0");
	});

	it("includes current products in markdown", async () => {
		const logSpy = vi.mocked(console.log);
		await reportCommand({});
		const output = logSpy.mock.calls[0][0] as string;
		expect(output).toContain("## Current Products");
		expect(output).toContain("React");
	});

	it("outputs JSON format", async () => {
		const logSpy = vi.mocked(console.log);
		await reportCommand({ format: "json" });
		const output = logSpy.mock.calls[0][0] as string;
		const parsed = JSON.parse(output);
		expect(parsed).toBeInstanceOf(Array);
		expect(parsed.length).toBe(2);
	});

	it("includes changelog link in markdown", async () => {
		mockedLoadRegistry.mockResolvedValue(
			makeRegistry({
				products: {
					nextjs: {
						displayName: "Next.js",
						package: "next",
						verifiedVersion: "14.0.0",
						verifiedAt: "2026-01-01T00:00:00.000Z",
						skills: ["nextjs-routing"],
						changelog: "https://github.com/vercel/next.js/releases",
					},
				},
			})
		);
		const logSpy = vi.mocked(console.log);
		await reportCommand({});
		const output = logSpy.mock.calls[0][0] as string;
		expect(output).toContain("[Next.js](https://github.com/vercel/next.js/releases)");
	});

	it("skips products with fetch errors", async () => {
		mockedFetchLatestVersions.mockResolvedValue(
			new Map<string, string | Error>([
				["next", new Error("Network error")],
				["react", "18.2.0"],
			])
		);
		const logSpy = vi.mocked(console.log);
		await reportCommand({ format: "json" });
		const output = logSpy.mock.calls[0][0] as string;
		const parsed = JSON.parse(output);
		// Only react should be present
		expect(parsed.length).toBe(1);
		expect(parsed[0].product).toBe("react");
	});

	it("loads custom registry path", async () => {
		await reportCommand({ registry: "custom.json" });
		expect(mockedLoadRegistry).toHaveBeenCalledWith("custom.json");
	});

	it("shows all current when nothing is stale", async () => {
		mockedFetchLatestVersions.mockResolvedValue(
			new Map([
				["next", "14.0.0"],
				["react", "18.2.0"],
			])
		);
		const logSpy = vi.mocked(console.log);
		await reportCommand({});
		const output = logSpy.mock.calls[0][0] as string;
		expect(output).not.toContain("## Stale Products");
		expect(output).toContain("## Current Products");
	});

	it("includes summary counts", async () => {
		const logSpy = vi.mocked(console.log);
		await reportCommand({});
		const output = logSpy.mock.calls[0][0] as string;
		expect(output).toContain("**Total products**: 2");
		expect(output).toContain("**Stale**: 1");
		expect(output).toContain("**Current**: 1");
	});
});
