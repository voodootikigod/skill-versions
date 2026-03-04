import { describe, expect, it } from "vitest";
import { packageDiff } from "./packages.js";

describe("packageDiff", () => {
	it("detects added packages", () => {
		const before = "```bash\nnpm install express\n```\n";
		const after = "```bash\nnpm install express\nnpm install cors\n```\n";
		const result = packageDiff(before, after);

		expect(result.added).toHaveLength(1);
		expect(result.added[0].name).toBe("cors");
		expect(result.removed).toHaveLength(0);
		expect(result.renamed).toHaveLength(0);
	});

	it("detects removed packages", () => {
		const before = "```bash\nnpm install express\nnpm install cors\n```\n";
		const after = "```bash\nnpm install express\n```\n";
		const result = packageDiff(before, after);

		expect(result.removed).toHaveLength(1);
		expect(result.removed[0].name).toBe("cors");
		expect(result.added).toHaveLength(0);
	});

	it("detects renamed packages (same ecosystem)", () => {
		const before = "```bash\nnpm install @vercel/deploy\n```\n";
		const after = "```bash\nnpm install vercel-deploy\n```\n";
		const result = packageDiff(before, after);

		expect(result.renamed).toHaveLength(1);
		expect(result.renamed[0].before).toBe("@vercel/deploy");
		expect(result.renamed[0].after).toBe("vercel-deploy");
		expect(result.added).toHaveLength(0);
		expect(result.removed).toHaveLength(0);
	});

	it("handles no changes", () => {
		const content = "```bash\nnpm install express\n```\n";
		const result = packageDiff(content, content);

		expect(result.added).toHaveLength(0);
		expect(result.removed).toHaveLength(0);
		expect(result.renamed).toHaveLength(0);
	});

	it("handles content with no packages", () => {
		const result = packageDiff("# Hello\n\nSome text\n", "# Hello\n\nDifferent text\n");

		expect(result.added).toHaveLength(0);
		expect(result.removed).toHaveLength(0);
		expect(result.renamed).toHaveLength(0);
	});

	it("handles pip packages", () => {
		const before = "```bash\npip install requests\n```\n";
		const after = "```bash\npip install httpx\n```\n";
		const result = packageDiff(before, after);

		expect(result.renamed).toHaveLength(1);
		expect(result.renamed[0].before).toBe("requests");
		expect(result.renamed[0].after).toBe("httpx");
		expect(result.renamed[0].ecosystem).toBe("pypi");
	});

	it("handles multiple package changes", () => {
		const before = "```bash\nnpm install express\nnpm install lodash\nnpm install moment\n```\n";
		const after = "```bash\nnpm install express\nnpm install dayjs\nnpm install axios\n```\n";
		const result = packageDiff(before, after);

		// lodash removed + dayjs added = rename (same ecosystem)
		// moment removed + axios added = rename (same ecosystem)
		expect(result.renamed.length).toBeGreaterThanOrEqual(1);
	});
});
