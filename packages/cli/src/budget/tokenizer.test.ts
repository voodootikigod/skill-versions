import { beforeEach, describe, expect, it } from "vitest";
import { countTokens, resetTokenizer } from "./tokenizer.js";

describe("tokenizer", () => {
	beforeEach(() => {
		resetTokenizer();
	});

	it("returns 0 for empty string", () => {
		expect(countTokens("")).toBe(0);
	});

	it("counts tokens for a simple string", () => {
		const tokens = countTokens("Hello, world!");
		expect(tokens).toBeGreaterThan(0);
		expect(tokens).toBeLessThan(10);
	});

	it("counts more tokens for longer text", () => {
		const short = countTokens("Hello");
		const long = countTokens("Hello, this is a much longer piece of text with many words in it.");
		expect(long).toBeGreaterThan(short);
	});

	it("handles markdown content", () => {
		const md = `# Heading

This is a paragraph with some **bold** and *italic* text.

\`\`\`bash
npm install something
\`\`\`
`;
		const tokens = countTokens(md);
		expect(tokens).toBeGreaterThan(10);
	});

	it("produces consistent results across calls", () => {
		const text = "Consistency is key.";
		const first = countTokens(text);
		const second = countTokens(text);
		expect(first).toBe(second);
	});

	it("handles unicode content", () => {
		const tokens = countTokens("Hello, world! Bonjour le monde!");
		expect(tokens).toBeGreaterThan(0);
	});
});
