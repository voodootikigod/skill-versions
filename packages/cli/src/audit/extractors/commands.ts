import type { ExtractedCommand } from "../types.js";

// Matches fenced code blocks with shell-like language hints
const CODE_BLOCK_RE = /^```(?:bash|sh|shell|zsh|console)?\s*$/;
const CODE_BLOCK_END = /^```\s*$/;
const SHELL_PROMPT_RE = /^\s*[$%>]\s+/;
const FENCE_PREFIX_RE = /^```/;

function stripPrompt(line: string): string {
	// Strip common shell prompts: "$ ", "% ", "> "
	return line.replace(SHELL_PROMPT_RE, "").trim();
}

export function extractCommands(content: string): ExtractedCommand[] {
	const results: ExtractedCommand[] = [];
	const lines = content.split("\n");

	let inCodeBlock = false;
	let isShellBlock = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNumber = i + 1;

		if (!inCodeBlock && CODE_BLOCK_RE.test(line)) {
			inCodeBlock = true;
			// Shell block if language hint is present or no language specified
			const lang = line.replace(FENCE_PREFIX_RE, "").trim();
			isShellBlock = lang === "" || ["bash", "sh", "shell", "zsh", "console"].includes(lang);
			continue;
		}

		if (inCodeBlock && CODE_BLOCK_END.test(line)) {
			inCodeBlock = false;
			isShellBlock = false;
			continue;
		}

		if (inCodeBlock && isShellBlock) {
			const stripped = stripPrompt(line);
			// Skip empty lines and comments
			if (stripped && !stripped.startsWith("#")) {
				results.push({
					command: stripped,
					line: lineNumber,
				});
			}
		}
	}

	return results;
}
