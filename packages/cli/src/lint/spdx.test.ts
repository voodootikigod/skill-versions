import { describe, expect, it } from "vitest";
import { isValidSpdx } from "./spdx.js";

describe("isValidSpdx", () => {
	it("returns true for common SPDX identifiers", () => {
		expect(isValidSpdx("MIT")).toBe(true);
		expect(isValidSpdx("Apache-2.0")).toBe(true);
		expect(isValidSpdx("BSD-2-Clause")).toBe(true);
		expect(isValidSpdx("BSD-3-Clause")).toBe(true);
		expect(isValidSpdx("ISC")).toBe(true);
		expect(isValidSpdx("GPL-2.0-only")).toBe(true);
		expect(isValidSpdx("GPL-3.0-only")).toBe(true);
		expect(isValidSpdx("MPL-2.0")).toBe(true);
		expect(isValidSpdx("LGPL-2.1-only")).toBe(true);
		expect(isValidSpdx("LGPL-3.0-only")).toBe(true);
		expect(isValidSpdx("Unlicense")).toBe(true);
		expect(isValidSpdx("CC0-1.0")).toBe(true);
		expect(isValidSpdx("0BSD")).toBe(true);
	});

	it("returns false for invalid identifiers", () => {
		expect(isValidSpdx("INVALID")).toBe(false);
		expect(isValidSpdx("Free")).toBe(false);
		expect(isValidSpdx("Open Source")).toBe(false);
		expect(isValidSpdx("Proprietary")).toBe(false);
		expect(isValidSpdx("WTFPL")).toBe(false);
	});

	it("supports OR expressions", () => {
		expect(isValidSpdx("MIT OR Apache-2.0")).toBe(true);
		expect(isValidSpdx("BSD-2-Clause OR MIT")).toBe(true);
	});

	it("supports AND expressions", () => {
		expect(isValidSpdx("MIT AND Apache-2.0")).toBe(true);
	});

	it("returns false for expressions with invalid parts", () => {
		expect(isValidSpdx("MIT OR INVALID")).toBe(false);
		expect(isValidSpdx("INVALID AND MIT")).toBe(false);
	});

	it("supports parenthesized expressions", () => {
		expect(isValidSpdx("(MIT OR Apache-2.0)")).toBe(true);
		expect(isValidSpdx("(MIT)")).toBe(true);
	});

	it("returns false for empty or non-string input", () => {
		expect(isValidSpdx("")).toBe(false);
		expect(isValidSpdx("   ")).toBe(false);
		expect(isValidSpdx(null as unknown as string)).toBe(false);
		expect(isValidSpdx(undefined as unknown as string)).toBe(false);
	});

	it("handles whitespace around identifiers", () => {
		expect(isValidSpdx("  MIT  ")).toBe(true);
		expect(isValidSpdx("MIT  OR  Apache-2.0")).toBe(true);
	});
});
