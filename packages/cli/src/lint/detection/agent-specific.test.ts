import { describe, expect, it } from "vitest";
import { detectsAgentSpecific } from "./agent-specific.js";

describe("detectsAgentSpecific", () => {
	it("detects Claude Code references", () => {
		expect(detectsAgentSpecific("In Claude Code, use the /add command.")).toBe(true);
		expect(detectsAgentSpecific("claude-code supports this pattern.")).toBe(true);
	});

	it("detects Cursor references", () => {
		expect(detectsAgentSpecific("In Cursor IDE, press Cmd+K.")).toBe(true);
		expect(detectsAgentSpecific("Cursor rules apply here.")).toBe(true);
	});

	it("detects Copilot references", () => {
		expect(detectsAgentSpecific("For Copilot workspace, use this pattern.")).toBe(true);
	});

	it("detects Windsurf references", () => {
		expect(detectsAgentSpecific("Windsurf handles this automatically.")).toBe(true);
	});

	it("detects .cursorrules file references", () => {
		expect(detectsAgentSpecific("Add this to your .cursorrules file.")).toBe(true);
	});

	it("detects agent-specific instruction markers", () => {
		expect(detectsAgentSpecific("This is agent-specific behavior.")).toBe(true);
		expect(detectsAgentSpecific("The following is agent-only content.")).toBe(true);
	});

	it("detects contextual agent patterns", () => {
		expect(detectsAgentSpecific("When using claude-code, configure this.")).toBe(true);
		expect(detectsAgentSpecific("For cursor, add the following.")).toBe(true);
	});

	it("returns false for generic content", () => {
		expect(detectsAgentSpecific("This is a general coding skill.")).toBe(false);
	});

	it("returns false for empty content", () => {
		expect(detectsAgentSpecific("")).toBe(false);
	});

	it("returns false when agent names are used generically", () => {
		// "cursor" without an agent context qualifier should not match
		expect(detectsAgentSpecific("Move the cursor to the end of the line.")).toBe(false);
	});
});
