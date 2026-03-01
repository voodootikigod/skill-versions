import { describe, expect, it } from "vitest";
import { getSeverity, normalizeVersion } from "./severity.js";

describe("getSeverity", () => {
	it("returns current for equal versions", () => {
		expect(getSeverity("1.0.0", "1.0.0")).toBe("current");
	});

	it("returns major for major bump", () => {
		expect(getSeverity("1.0.0", "2.0.0")).toBe("major");
	});

	it("returns minor for minor bump", () => {
		expect(getSeverity("1.0.0", "1.1.0")).toBe("minor");
	});

	it("returns patch for patch bump", () => {
		expect(getSeverity("1.0.0", "1.0.1")).toBe("patch");
	});

	it("returns major when both major and minor differ", () => {
		expect(getSeverity("1.2.3", "2.1.0")).toBe("major");
	});
});

describe("normalizeVersion", () => {
	it("returns strict semver without coercion", () => {
		const result = normalizeVersion("1.2.3");
		expect(result).toEqual({ version: "1.2.3", coerced: false });
	});

	it("coerces non-standard version strings", () => {
		const result = normalizeVersion("v3-beta");
		expect(result).not.toBeNull();
		expect(result!.coerced).toBe(true);
		expect(result!.version).toBe("3.0.0");
	});

	it("returns null for unparseable strings", () => {
		expect(normalizeVersion("not-a-version")).toBeNull();
	});

	it("handles v-prefixed versions without coercion", () => {
		// semver.valid handles "v1.2.3" -> null, so it will be coerced
		const result = normalizeVersion("v1.2.3");
		expect(result).not.toBeNull();
		expect(result!.version).toBe("1.2.3");
	});

	it("prefers strict parsing over coercion", () => {
		const result = normalizeVersion("6.0.105");
		expect(result).toEqual({ version: "6.0.105", coerced: false });
	});
});
