import { describe, expect, it } from "vitest";

describe("npm URL construction", () => {
	function buildNpmUrl(packageName: string): string {
		return `https://registry.npmjs.org/${packageName.replace("/", "%2F")}`;
	}

	it("handles unscoped packages", () => {
		expect(buildNpmUrl("chalk")).toBe("https://registry.npmjs.org/chalk");
	});

	it("handles scoped packages", () => {
		expect(buildNpmUrl("@vercel/blob")).toBe("https://registry.npmjs.org/@vercel%2Fblob");
	});

	it("preserves @ for scoped packages", () => {
		const url = buildNpmUrl("@upstash/redis");
		expect(url).toContain("@upstash");
		expect(url).not.toContain("%40");
	});

	it("encodes only the first slash in scoped packages", () => {
		const url = buildNpmUrl("@neondatabase/serverless");
		expect(url).toBe("https://registry.npmjs.org/@neondatabase%2Fserverless");
	});
});
