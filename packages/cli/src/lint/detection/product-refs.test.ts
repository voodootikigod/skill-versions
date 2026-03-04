import { describe, expect, it } from "vitest";
import { detectsProduct } from "./product-refs.js";

describe("detectsProduct", () => {
	it("detects npm install commands", () => {
		expect(detectsProduct("Run `npm install express` to get started.")).toBe(true);
	});

	it("detects pnpm add commands", () => {
		expect(detectsProduct("Run `pnpm add react` to install React.")).toBe(true);
	});

	it("detects yarn add commands", () => {
		expect(detectsProduct("Use `yarn add lodash` for utilities.")).toBe(true);
	});

	it("detects pip install commands", () => {
		expect(detectsProduct("Run `pip install flask` to install Flask.")).toBe(true);
	});

	it("detects cargo add commands", () => {
		expect(detectsProduct("Run `cargo add serde` to add Serde.")).toBe(true);
	});

	it("detects product name + version", () => {
		expect(detectsProduct("This skill covers Next.js 15 patterns.")).toBe(true);
		expect(detectsProduct("React 19 introduces new features.")).toBe(true);
		expect(detectsProduct("AI SDK 6.1 usage patterns.")).toBe(true);
	});

	it("detects version references", () => {
		expect(detectsProduct("Compatible with version 4.2.0 and above.")).toBe(true);
		expect(detectsProduct("Requires v3.x or later.")).toBe(true);
	});

	it("returns false for generic content without product references", () => {
		expect(detectsProduct("This skill provides general coding best practices.")).toBe(false);
	});

	it("returns false for empty content", () => {
		expect(detectsProduct("")).toBe(false);
	});
});
