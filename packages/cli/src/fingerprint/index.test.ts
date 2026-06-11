import { beforeEach, describe, expect, it, vi } from "vitest";

const WHITESPACE_SPLIT_RE = /\s+/;
const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

vi.mock("../budget/tokenizer.js", () => ({
	countTokens: vi.fn((text: string) => text.split(WHITESPACE_SPLIT_RE).filter(Boolean).length),
	resetTokenizer: vi.fn(),
}));

vi.mock("../shared/discovery.js", () => ({
	discoverSkillFiles: vi.fn(),
}));

vi.mock("../skill-io.js", () => ({
	readSkillFile: vi.fn(),
	writeSkillFile: vi.fn(),
}));

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverSkillFiles } from "../shared/discovery.js";
import { generateKeyPair } from "../signing/index.js";
import { readSkillFile, writeSkillFile } from "../skill-io.js";
import { runFingerprint, verifyFingerprintRegistry } from "./index.js";

const mockDiscover = vi.mocked(discoverSkillFiles);
const mockRead = vi.mocked(readSkillFile);
const mockWrite = vi.mocked(writeSkillFile);

function makeRaw(name: string, version: string, content = "# Test\n\nSome content.") {
	return `---\nname: ${name}\nversion: ${version}\n---\n${content}`;
}

describe("runFingerprint", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns empty registry for no files", async () => {
		mockDiscover.mockResolvedValue([]);
		const result = await runFingerprint(["."]);
		expect(result.version).toBe(1);
		expect(result.entries).toHaveLength(0);
		expect(result.generatedAt).toBeDefined();
	});

	it("generates fingerprints for discovered skills", async () => {
		const raw = makeRaw("react", "19.1.0");
		mockDiscover.mockResolvedValue(["/skills/react/SKILL.md"]);
		mockRead.mockResolvedValue({
			path: "/skills/react/SKILL.md",
			frontmatter: { name: "react", version: "19.1.0" },
			content: "# Test\n\nSome content.",
			raw,
		});

		const result = await runFingerprint(["."]);
		expect(result.entries).toHaveLength(1);
		expect(result.entries[0].skillId).toBe("react");
		expect(result.entries[0].version).toBe("19.1.0");
		expect(result.entries[0].frontmatterHash).toMatch(SHA256_HEX_RE);
		expect(result.entries[0].contentHash).toMatch(SHA256_HEX_RE);
		expect(result.entries[0].prefixHash).toMatch(SHA256_HEX_RE);
		expect(result.entries[0].tokenCount).toBeGreaterThan(0);
	});

	it("detects existing watermark", async () => {
		const raw =
			"---\nname: react\nversion: 19.1.0\n---\n<!-- skill:react/19.1.0 @acme/react -->\n# Content";
		mockDiscover.mockResolvedValue(["/skills/react/SKILL.md"]);
		mockRead.mockResolvedValue({
			path: "/skills/react/SKILL.md",
			frontmatter: { name: "react", version: "19.1.0" },
			content: "<!-- skill:react/19.1.0 @acme/react -->\n# Content",
			raw,
		});

		const result = await runFingerprint(["."]);
		expect(result.entries[0].watermark).toBe("skill:react/19.1.0 @acme/react");
	});

	it("injects watermark when requested and missing", async () => {
		const raw = makeRaw("react", "19.1.0");
		mockDiscover.mockResolvedValue(["/skills/react/SKILL.md"]);
		mockRead.mockResolvedValue({
			path: "/skills/react/SKILL.md",
			frontmatter: { name: "react", version: "19.1.0" },
			content: "# Test\n\nSome content.",
			raw,
		});
		mockWrite.mockResolvedValue();

		const result = await runFingerprint(["."], { injectWatermarks: true });
		expect(mockWrite).toHaveBeenCalledOnce();
		const writtenContent = mockWrite.mock.calls[0][1];
		expect(writtenContent).toContain("<!-- skill:react/19.1.0 -->");
		expect(result.entries[0].watermark).toBe("skill:react/19.1.0");
	});

	it("does not inject watermark when already present", async () => {
		const raw = "---\nname: react\nversion: 19.1.0\n---\n<!-- skill:react/19.1.0 -->\n# Content";
		mockDiscover.mockResolvedValue(["/skills/react/SKILL.md"]);
		mockRead.mockResolvedValue({
			path: "/skills/react/SKILL.md",
			frontmatter: { name: "react", version: "19.1.0" },
			content: "<!-- skill:react/19.1.0 -->\n# Content",
			raw,
		});

		await runFingerprint(["."], { injectWatermarks: true });
		expect(mockWrite).not.toHaveBeenCalled();
	});

	it("handles multiple skills", async () => {
		mockDiscover.mockResolvedValue(["/skills/react/SKILL.md", "/skills/vue/SKILL.md"]);
		mockRead
			.mockResolvedValueOnce({
				path: "/skills/react/SKILL.md",
				frontmatter: { name: "react", version: "19.1.0" },
				content: "# React",
				raw: makeRaw("react", "19.1.0"),
			})
			.mockResolvedValueOnce({
				path: "/skills/vue/SKILL.md",
				frontmatter: { name: "vue", version: "3.5.0" },
				content: "# Vue",
				raw: makeRaw("vue", "3.5.0"),
			});

		const result = await runFingerprint(["."]);
		expect(result.entries).toHaveLength(2);
		expect(result.entries[0].skillId).toBe("react");
		expect(result.entries[1].skillId).toBe("vue");
	});

	it("uses product-version as fallback", async () => {
		const raw = "---\nname: react\nproduct-version: 19.1.0\n---\n# Content";
		mockDiscover.mockResolvedValue(["/skills/react/SKILL.md"]);
		mockRead.mockResolvedValue({
			path: "/skills/react/SKILL.md",
			frontmatter: { name: "react", "product-version": "19.1.0" },
			content: "# Content",
			raw,
		});

		const result = await runFingerprint(["."]);
		expect(result.entries[0].version).toBe("19.1.0");
	});
});

describe("fingerprint registry signing", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function mockOneSkill(): void {
		const raw = makeRaw("react", "19.1.0");
		mockDiscover.mockResolvedValue(["/skills/react/SKILL.md"]);
		mockRead.mockResolvedValue({
			path: "/skills/react/SKILL.md",
			frontmatter: { name: "react", version: "19.1.0" },
			content: "# Test\n\nSome content.",
			raw,
		});
	}

	it("leaves the registry unsigned by default", async () => {
		mockOneSkill();
		const result = await runFingerprint(["."]);
		expect(result.signature).toBeUndefined();
		expect(result.signedBy).toBeUndefined();
	});

	it("signs the registry and verifies under the public key", async () => {
		const { publicKey, privateKey } = generateKeyPair();
		const dir = await mkdtemp(join(tmpdir(), "fp-sign-"));
		const keyPath = join(dir, "signing.key");
		await writeFile(keyPath, privateKey, "utf-8");

		mockOneSkill();
		const result = await runFingerprint(["."], { signKeyPath: keyPath, keyId: "ci-key" });

		expect(typeof result.signature).toBe("string");
		expect(result.signedBy).toBe("ci-key");
		expect(verifyFingerprintRegistry(result, publicKey)).toBe(true);
	});

	it("fails verification when the registry is tampered", async () => {
		const { publicKey, privateKey } = generateKeyPair();
		const dir = await mkdtemp(join(tmpdir(), "fp-sign-"));
		const keyPath = join(dir, "signing.key");
		await writeFile(keyPath, privateKey, "utf-8");

		mockOneSkill();
		const result = await runFingerprint(["."], { signKeyPath: keyPath, keyId: "ci-key" });
		result.entries[0].contentHash = "0".repeat(64);

		expect(verifyFingerprintRegistry(result, publicKey)).toBe(false);
	});
});
