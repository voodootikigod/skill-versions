import { describe, expect, it } from "vitest";
import { extractCommands } from "./commands.js";

describe("extractCommands", () => {
	it("extracts commands from bash code blocks", () => {
		const content = "Example:\n```bash\nnpm test\nnpm run build\n```";
		const result = extractCommands(content);
		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({ command: "npm test", line: 3 });
		expect(result[1]).toMatchObject({ command: "npm run build", line: 4 });
	});

	it("extracts from sh code blocks", () => {
		const content = "```sh\necho hello\n```";
		const result = extractCommands(content);
		expect(result).toHaveLength(1);
		expect(result[0].command).toBe("echo hello");
	});

	it("extracts from shell code blocks", () => {
		const content = "```shell\nls -la\n```";
		const result = extractCommands(content);
		expect(result).toHaveLength(1);
		expect(result[0].command).toBe("ls -la");
	});

	it("extracts from untagged code blocks", () => {
		const content = "```\ncurl https://example.com\n```";
		const result = extractCommands(content);
		expect(result).toHaveLength(1);
		expect(result[0].command).toBe("curl https://example.com");
	});

	it("strips $ prompts", () => {
		const content = "```bash\n$ npm install\n$ npm test\n```";
		const result = extractCommands(content);
		expect(result).toHaveLength(2);
		expect(result[0].command).toBe("npm install");
		expect(result[1].command).toBe("npm test");
	});

	it("strips % prompts", () => {
		const content = "```bash\n% ls -la\n```";
		const result = extractCommands(content);
		expect(result).toHaveLength(1);
		expect(result[0].command).toBe("ls -la");
	});

	it("strips > prompts", () => {
		const content = "```bash\n> node app.js\n```";
		const result = extractCommands(content);
		expect(result).toHaveLength(1);
		expect(result[0].command).toBe("node app.js");
	});

	it("skips comments", () => {
		const content = "```bash\n# This is a comment\nnpm test\n```";
		const result = extractCommands(content);
		expect(result).toHaveLength(1);
		expect(result[0].command).toBe("npm test");
	});

	it("skips empty lines", () => {
		const content = "```bash\n\nnpm test\n\n```";
		const result = extractCommands(content);
		expect(result).toHaveLength(1);
	});

	it("ignores non-shell code blocks", () => {
		const content = "```javascript\nconsole.log('hello');\n```";
		const result = extractCommands(content);
		expect(result).toHaveLength(0);
	});

	it("handles multiple code blocks", () => {
		const content = "```bash\ncmd1\n```\nSome text\n```sh\ncmd2\n```";
		const result = extractCommands(content);
		expect(result).toHaveLength(2);
		expect(result[0].command).toBe("cmd1");
		expect(result[1].command).toBe("cmd2");
	});

	it("returns empty for no code blocks", () => {
		const content = "This is plain text without any code blocks.";
		expect(extractCommands(content)).toHaveLength(0);
	});
});
