import { describe, expect, it } from "vitest";
import { extractUrls } from "./urls.js";

describe("extractUrls", () => {
	it("extracts markdown links", () => {
		const content = "Visit [docs](https://example.com/docs) for more.";
		const result = extractUrls(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			url: "https://example.com/docs",
			text: "docs",
			line: 1,
		});
	});

	it("extracts bare URLs", () => {
		const content = "Go to https://example.com for info.";
		const result = extractUrls(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			url: "https://example.com",
			line: 1,
		});
	});

	it("extracts http URLs", () => {
		const content = "Check http://localhost:3000 for dev.";
		const result = extractUrls(content);
		expect(result).toHaveLength(1);
		expect(result[0].url).toBe("http://localhost:3000");
	});

	it("deduplicates URLs", () => {
		const content = "Visit https://example.com and also https://example.com again.";
		const result = extractUrls(content);
		expect(result).toHaveLength(1);
	});

	it("deduplicates across markdown and bare", () => {
		const content = "[example](https://example.com) or https://example.com";
		const result = extractUrls(content);
		expect(result).toHaveLength(1);
		expect(result[0].text).toBe("example");
	});

	it("tracks line numbers", () => {
		const content = "line 1\nhttps://first.com\nline 3\nhttps://second.com";
		const result = extractUrls(content);
		expect(result).toHaveLength(2);
		expect(result[0].line).toBe(2);
		expect(result[1].line).toBe(4);
	});

	it("handles multiple links on same line", () => {
		const content = "[a](https://a.com) and [b](https://b.com)";
		const result = extractUrls(content);
		expect(result).toHaveLength(2);
	});

	it("returns empty for no URLs", () => {
		const content = "This text has no URLs at all.";
		expect(extractUrls(content)).toHaveLength(0);
	});
});
