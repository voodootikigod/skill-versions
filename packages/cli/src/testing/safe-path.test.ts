import { describe, expect, it } from "vitest";
import { safePath } from "./safe-path.js";

describe("safePath", () => {
	it("resolves a valid relative path within the base directory", () => {
		const result = safePath("/base/dir", "sub/file.ts");
		expect(result).toBe("/base/dir/sub/file.ts");
	});

	it("throws on path traversal with ../", () => {
		expect(() => safePath("/base/dir", "../../etc/passwd")).toThrow("Path traversal detected");
	});

	it("throws on absolute paths outside the base", () => {
		expect(() => safePath("/base/dir", "/etc/passwd")).toThrow("Path traversal detected");
	});

	it("allows the base directory itself", () => {
		const result = safePath("/base/dir", ".");
		expect(result).toBe("/base/dir");
	});

	it("normalizes paths with redundant segments", () => {
		const result = safePath("/base/dir", "sub/../sub/file.ts");
		expect(result).toBe("/base/dir/sub/file.ts");
	});
});
