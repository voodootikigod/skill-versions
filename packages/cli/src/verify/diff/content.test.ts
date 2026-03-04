import { describe, expect, it } from "vitest";
import { contentSimilarity, onlyUrlsChanged, onlyVersionsChanged } from "./content.js";

describe("contentSimilarity", () => {
	it("returns 1.0 for identical strings", () => {
		const text = "hello world foo bar";
		expect(contentSimilarity(text, text)).toBe(1.0);
	});

	it("returns 1.0 for both empty strings", () => {
		expect(contentSimilarity("", "")).toBe(1.0);
	});

	it("returns 0.0 for completely different strings", () => {
		expect(contentSimilarity("hello world", "foo bar baz")).toBe(0.0);
	});

	it("returns a value between 0 and 1 for partially similar strings", () => {
		const similarity = contentSimilarity("hello world foo", "hello world bar");
		expect(similarity).toBeGreaterThan(0.0);
		expect(similarity).toBeLessThan(1.0);
	});

	it("is case-insensitive", () => {
		expect(contentSimilarity("Hello World", "hello world")).toBe(1.0);
	});

	it("normalizes whitespace", () => {
		expect(contentSimilarity("hello  world", "hello world")).toBe(1.0);
	});
});

describe("onlyVersionsChanged", () => {
	it("returns true when only semver numbers differ", () => {
		const before = "npm install express@4.18.0\nUse version 2.0.0";
		const after = "npm install express@4.19.0\nUse version 2.1.0";
		expect(onlyVersionsChanged(before, after)).toBe(true);
	});

	it("returns false when text also differs", () => {
		const before = "npm install express@4.18.0";
		const after = "npm install fastify@4.19.0";
		expect(onlyVersionsChanged(before, after)).toBe(false);
	});

	it("returns false for identical strings", () => {
		const text = "npm install express@4.18.0";
		expect(onlyVersionsChanged(text, text)).toBe(false);
	});

	it("returns false when no versions present", () => {
		expect(onlyVersionsChanged("hello world", "hello world")).toBe(false);
	});
});

describe("onlyUrlsChanged", () => {
	it("returns true when only URLs differ", () => {
		const before = "See https://example.com/v1/docs for details";
		const after = "See https://example.com/v2/docs for details";
		expect(onlyUrlsChanged(before, after)).toBe(true);
	});

	it("returns false when text also differs", () => {
		const before = "Check https://old.com for info";
		const after = "Visit https://new.com for details";
		expect(onlyUrlsChanged(before, after)).toBe(false);
	});

	it("returns false for identical strings", () => {
		const text = "See https://example.com/docs";
		expect(onlyUrlsChanged(text, text)).toBe(false);
	});
});
