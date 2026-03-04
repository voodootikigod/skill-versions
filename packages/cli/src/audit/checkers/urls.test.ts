import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckContext, ExtractedUrl } from "../types.js";
import { urlChecker } from "./urls.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeContext(urls: ExtractedUrl[]): CheckContext {
	return {
		file: { path: "test/SKILL.md", frontmatter: {}, content: "", raw: "" },
		packages: [],
		commands: [],
		urls,
	};
}

function url(u: string, line = 1, text?: string): ExtractedUrl {
	return { url: u, line, text };
}

describe("urlChecker", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("reports unreachable URLs", async () => {
		mockFetch.mockResolvedValue({ ok: false, status: 404 });
		const ctx = makeContext([url("https://example.com/missing")]);
		const findings = await urlChecker.check(ctx);
		expect(findings).toHaveLength(1);
		expect(findings[0].severity).toBe("medium");
		expect(findings[0].category).toBe("url-liveness");
		expect(findings[0].message).toContain("404");
	});

	it("passes for reachable URLs", async () => {
		mockFetch.mockResolvedValue({ ok: true, status: 200 });
		const ctx = makeContext([url("https://example.com")]);
		const findings = await urlChecker.check(ctx);
		expect(findings).toHaveLength(0);
	});

	it("reports connection failures", async () => {
		mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
		const ctx = makeContext([url("https://dead-host.example.com")]);
		const findings = await urlChecker.check(ctx);
		expect(findings).toHaveLength(1);
		expect(findings[0].message).toContain("connection failed");
	});

	it("skips localhost URLs", async () => {
		const ctx = makeContext([url("http://localhost:3000"), url("http://127.0.0.1:8080")]);
		const findings = await urlChecker.check(ctx);
		expect(findings).toHaveLength(0);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("deduplicates URLs before checking", async () => {
		mockFetch.mockResolvedValue({ ok: true, status: 200 });
		const ctx = makeContext([url("https://example.com", 1), url("https://example.com", 5)]);
		const findings = await urlChecker.check(ctx);
		expect(findings).toHaveLength(0);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it("reports all occurrences when URL is dead", async () => {
		mockFetch.mockResolvedValue({ ok: false, status: 404 });
		const ctx = makeContext([url("https://dead.com/docs", 3), url("https://dead.com/docs", 10)]);
		const findings = await urlChecker.check(ctx);
		expect(findings).toHaveLength(2);
		expect(findings[0].line).toBe(3);
		expect(findings[1].line).toBe(10);
	});

	it("includes link text in evidence when available", async () => {
		mockFetch.mockResolvedValue({ ok: false, status: 404 });
		const ctx = makeContext([url("https://example.com/docs", 1, "documentation")]);
		const findings = await urlChecker.check(ctx);
		expect(findings[0].evidence).toContain("documentation");
	});
});
