import type { Tiktoken } from "js-tiktoken";
import { encodingForModel } from "js-tiktoken";

/**
 * Lazily initialized encoder. NOT a module-level constant to avoid
 * breaking test mocks (see CLAUDE.md development pitfalls).
 */
let encoder: Tiktoken | null = null;

function getEncoder(): Tiktoken {
	if (!encoder) {
		encoder = encodingForModel("gpt-4o");
	}
	return encoder;
}

/**
 * Count the number of tokens in the given text using cl100k_base encoding.
 * Approximate across model families but within 5% is acceptable.
 */
export function countTokens(text: string): number {
	if (text.length === 0) {
		return 0;
	}
	const enc = getEncoder();
	return enc.encode(text).length;
}

/**
 * Reset the encoder instance. Call in test `beforeEach` to ensure
 * mock isolation.
 */
export function resetTokenizer(): void {
	encoder = null;
}
