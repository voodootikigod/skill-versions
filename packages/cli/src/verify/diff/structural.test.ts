import { describe, expect, it } from "vitest";
import { structuralDiff } from "./structural.js";

describe("structuralDiff", () => {
	it("detects no changes for identical content", () => {
		const content = "# Title\n\nSome content\n\n## Section A\n\nMore content\n";
		const result = structuralDiff(content, content);

		expect(result.sectionsAdded).toHaveLength(0);
		expect(result.sectionsRemoved).toHaveLength(0);
		expect(result.sectionsModified).toHaveLength(0);
		expect(result.codeBlocksDelta).toBe(0);
	});

	it("detects added sections", () => {
		const before = "# Title\n\nContent\n";
		const after = "# Title\n\nContent\n\n## New Section\n\nNew content\n";
		const result = structuralDiff(before, after);

		expect(result.sectionsAdded).toContain("New Section");
		expect(result.sectionsRemoved).toHaveLength(0);
	});

	it("detects removed sections", () => {
		const before = "# Title\n\nContent\n\n## Old Section\n\nOld content\n";
		const after = "# Title\n\nContent\n";
		const result = structuralDiff(before, after);

		expect(result.sectionsRemoved).toContain("Old Section");
		expect(result.sectionsAdded).toHaveLength(0);
	});

	it("detects modified sections", () => {
		const before = "# Title\n\n## Section A\n\nOriginal content\n";
		const after = "# Title\n\n## Section A\n\nUpdated content with changes\n";
		const result = structuralDiff(before, after);

		expect(result.sectionsModified).toContain("Section A");
		expect(result.sectionsAdded).toHaveLength(0);
		expect(result.sectionsRemoved).toHaveLength(0);
	});

	it("counts code blocks correctly", () => {
		const before = "# Title\n\n```bash\nnpm install\n```\n";
		const after =
			"# Title\n\n```bash\nnpm install\n```\n\n```js\nconst x = 1;\n```\n\n```python\nprint('hello')\n```\n";
		const result = structuralDiff(before, after);

		expect(result.codeBlocksBefore).toBe(1);
		expect(result.codeBlocksAfter).toBe(3);
		expect(result.codeBlocksDelta).toBe(2);
	});

	it("handles multiple changes simultaneously", () => {
		const before =
			"# Title\n\n## Keep This\n\nContent\n\n## Remove This\n\nOld\n\n## Modify This\n\nOriginal\n";
		const after =
			"# Title\n\n## Keep This\n\nContent\n\n## Modify This\n\nChanged\n\n## Add This\n\nNew\n";
		const result = structuralDiff(before, after);

		expect(result.sectionsAdded).toContain("Add This");
		expect(result.sectionsRemoved).toContain("Remove This");
		expect(result.sectionsModified).toContain("Modify This");
	});

	it("handles empty content", () => {
		const result = structuralDiff("", "# New\n\nContent\n");
		expect(result.sectionsAdded).toContain("New");
	});

	it("handles content with no headings", () => {
		const before = "Just some text\n";
		const after = "Different text\n";
		const result = structuralDiff(before, after);

		expect(result.sectionsAdded).toHaveLength(0);
		expect(result.sectionsRemoved).toHaveLength(0);
	});
});
