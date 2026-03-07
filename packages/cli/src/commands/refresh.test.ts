import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock all external dependencies
vi.mock("../npm.js", () => ({
	fetchLatestVersions: vi.fn(),
}));

vi.mock("../registry.js", () => ({
	loadRegistry: vi.fn(),
	saveRegistry: vi.fn(),
}));

vi.mock("../changelog.js", () => ({
	fetchChangelog: vi.fn(),
}));

vi.mock("../skill-io.js", () => ({
	readSkillFile: vi.fn(),
	writeSkillFile: vi.fn(),
}));

vi.mock("../llm/providers.js", () => ({
	resolveModel: vi.fn(),
}));

vi.mock("ai", () => ({
	generateObject: vi.fn(),
}));

import { generateObject } from "ai";
import { fetchChangelog } from "../changelog.js";
import { resolveModel } from "../llm/providers.js";
import { fetchLatestVersions } from "../npm.js";
import { loadRegistry, saveRegistry } from "../registry.js";
import { readSkillFile, writeSkillFile } from "../skill-io.js";
import type { Registry } from "../types.js";
import { refreshCommand } from "./refresh.js";

const mockedLoadRegistry = vi.mocked(loadRegistry);
const mockedSaveRegistry = vi.mocked(saveRegistry);
const mockedFetchLatestVersions = vi.mocked(fetchLatestVersions);
const mockedFetchChangelog = vi.mocked(fetchChangelog);
const mockedReadSkillFile = vi.mocked(readSkillFile);
const mockedWriteSkillFile = vi.mocked(writeSkillFile);
const mockedResolveModel = vi.mocked(resolveModel);
const mockedGenerateObject = vi.mocked(generateObject);

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

describe("refreshCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedLoadRegistry.mockResolvedValue(makeRegistry());
		mockedSaveRegistry.mockResolvedValue("skills-check.json");
		mockedFetchLatestVersions.mockResolvedValue(new Map([["next", "15.0.0"]]));
		mockedFetchChangelog.mockResolvedValue("## v15.0.0\n- Breaking changes");
		mockedResolveModel.mockResolvedValue({} as Awaited<ReturnType<typeof resolveModel>>);
		mockedReadSkillFile.mockResolvedValue({
			path: "skills/nextjs-routing/SKILL.md",
			raw: "---\nname: nextjs-routing\nproduct-version: '14.0.0'\n---\n# Routing",
			content: "# Routing",
			frontmatter: { name: "nextjs-routing", "product-version": "14.0.0" },
		});
		mockedWriteSkillFile.mockResolvedValue(undefined);
		mockedGenerateObject.mockResolvedValue({
			object: {
				summary: "Updated routing docs for Next.js 15",
				confidence: "high",
				breakingChanges: true,
				changes: [{ section: "Routing", description: "Updated API" }],
				updatedContent:
					"---\nname: nextjs-routing\nproduct-version: '15.0.0'\n---\n# Routing (updated)",
			},
		} as Awaited<ReturnType<typeof generateObject>>);

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
		const code = await refreshCommand(undefined, { yes: true });
		expect(code).toBe(0);
		const logCalls = vi.mocked(console.log).mock.calls.map((c) => String(c[0]));
		expect(logCalls.some((c) => c.includes("current"))).toBe(true);
	});

	it("returns 2 when product not found", async () => {
		const code = await refreshCommand(undefined, { product: "nonexistent", yes: true });
		expect(code).toBe(2);
	});

	it("skips products with fetch errors", async () => {
		mockedFetchLatestVersions.mockResolvedValue(
			new Map<string, string | Error>([["next", new Error("Network error")]])
		);
		const code = await refreshCommand(undefined, { yes: true });
		expect(code).toBe(0);
		expect(console.error).toHaveBeenCalled();
	});

	it("applies changes with --yes", async () => {
		await refreshCommand("./skills", { yes: true });
		expect(mockedWriteSkillFile).toHaveBeenCalled();
		expect(mockedSaveRegistry).toHaveBeenCalled();
	});

	it("does not write files with --dry-run", async () => {
		await refreshCommand("./skills", { dryRun: true });
		expect(mockedWriteSkillFile).not.toHaveBeenCalled();
		expect(mockedSaveRegistry).not.toHaveBeenCalled();
	});

	it("calls LLM with correct parameters", async () => {
		await refreshCommand("./skills", { yes: true });
		expect(mockedGenerateObject).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.any(String),
				prompt: expect.any(String),
			})
		);
	});

	it("resolves skills directory from CLI arg", async () => {
		await refreshCommand("./my-skills", { yes: true });
		expect(mockedReadSkillFile).toHaveBeenCalledWith(expect.stringContaining("my-skills"));
	});

	it("resolves skills directory from registry", async () => {
		mockedLoadRegistry.mockResolvedValue(
			makeRegistry({ skillsDir: "./custom-skills" } as Partial<Registry>)
		);
		await refreshCommand(undefined, { yes: true });
		expect(mockedReadSkillFile).toHaveBeenCalledWith(expect.stringContaining("custom-skills"));
	});

	it("defaults skills directory to ./skills", async () => {
		mockedLoadRegistry.mockResolvedValue(makeRegistry());
		await refreshCommand(undefined, { yes: true });
		expect(mockedReadSkillFile).toHaveBeenCalledWith(expect.stringContaining("skills"));
	});

	it("skips platform-versioned products", async () => {
		mockedLoadRegistry.mockResolvedValue(
			makeRegistry({
				products: {
					vercel: {
						displayName: "Vercel",
						package: "vercel",
						verifiedVersion: "platform",
						verifiedAt: "2026-01-01T00:00:00.000Z",
						skills: ["vercel-deploy"],
					},
				},
			})
		);
		mockedFetchLatestVersions.mockResolvedValue(new Map([["vercel", "35.0.0"]]));
		const code = await refreshCommand(undefined, { yes: true });
		expect(code).toBe(0);
		expect(mockedGenerateObject).not.toHaveBeenCalled();
	});

	it("handles skill file read errors gracefully", async () => {
		mockedReadSkillFile.mockRejectedValue(new Error("ENOENT"));
		await refreshCommand("./skills", { yes: true });
		expect(console.error).toHaveBeenCalled();
	});

	it("patches product-version when LLM omits bump", async () => {
		const originalRaw =
			"---\nname: nextjs-routing\nproduct-version: '14.0.0'\n---\n# Routing\n\nOld content.\n";
		const updatedRaw =
			"---\nname: nextjs-routing\nproduct-version: '14.0.0'\n---\n# Routing\n\nNew content.\nExtra line.\n";

		// LLM returns changed content but without bumped version
		mockedGenerateObject.mockResolvedValue({
			object: {
				summary: "Updated",
				confidence: "high",
				breakingChanges: false,
				changes: [{ section: "Routing", description: "Updated API" }],
				updatedContent: updatedRaw,
			},
		} as Awaited<ReturnType<typeof generateObject>>);

		// First call: initial read. Second call: verification read after write (still old version)
		mockedReadSkillFile
			.mockResolvedValueOnce({
				path: "skills/nextjs-routing/SKILL.md",
				raw: originalRaw,
				content: "# Routing\n\nOld content.\n",
				frontmatter: { name: "nextjs-routing", "product-version": "14.0.0" },
			})
			.mockResolvedValueOnce({
				path: "skills/nextjs-routing/SKILL.md",
				raw: updatedRaw,
				content: "# Routing\n\nNew content.\nExtra line.\n",
				frontmatter: { name: "nextjs-routing", "product-version": "14.0.0" },
			});

		await refreshCommand("./skills", { yes: true });

		// Should write twice — once for LLM output, once for version patch
		expect(mockedWriteSkillFile).toHaveBeenCalledTimes(2);
	});

	it("uses custom registry path", async () => {
		await refreshCommand(undefined, { registry: "custom.json", yes: true });
		expect(mockedLoadRegistry).toHaveBeenCalledWith("custom.json");
	});

	it("filters to single product with --product", async () => {
		mockedLoadRegistry.mockResolvedValue(
			makeRegistry({
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
						verifiedVersion: "18.0.0",
						verifiedAt: "2026-01-01T00:00:00.000Z",
						skills: ["react-basics"],
					},
				},
			})
		);
		mockedFetchLatestVersions.mockResolvedValue(
			new Map([
				["next", "15.0.0"],
				["react", "19.0.0"],
			])
		);

		await refreshCommand("./skills", { product: "nextjs", yes: true });

		// readSkillFile is called twice for the one skill: once to read, once to verify after write
		expect(mockedReadSkillFile).toHaveBeenCalledTimes(2);
		expect(mockedReadSkillFile).toHaveBeenCalledWith(expect.stringContaining("nextjs-routing"));
		// Should NOT have been called with the react skill
		for (const call of mockedReadSkillFile.mock.calls) {
			expect(String(call[0])).not.toContain("react-basics");
		}
	});
});
