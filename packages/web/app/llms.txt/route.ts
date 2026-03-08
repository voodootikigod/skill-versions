import { commands } from "@/lib/commands";

export function GET() {
	const commandList = commands.map((cmd) => `- ${cmd.name}: ${cmd.tagline}`).join("\n");

	const body = `# Skills Check

> The missing quality toolkit for Agent Skills

skills-check is the quality and integrity layer for Agent Skills (SKILL.md files). It provides 10 commands covering freshness detection, security auditing, metadata linting, token budget analysis, semver verification, policy enforcement, and eval testing. Agent Skills are markdown documents with YAML frontmatter that instruct AI coding agents (Claude Code, Cursor, Codex, etc.) how to work with specific products, frameworks, and patterns. skills-check ensures these instructions are correct, safe, current, and efficient.

## Commands

${commandList}

## Further Reading

- [Full LLM-optimized reference](https://skillscheck.ai/llms-full.txt): Complete CLI reference with options, examples, and specifications
- [Documentation](https://skillscheck.ai/docs): Human-readable documentation
- [npm package](https://www.npmjs.com/package/skills-check): Install via npm
- [GitHub repository](https://github.com/voodootikigod/skills-check): Source code and issues
- [JSON Schema](https://skillscheck.ai/schema.json): Registry file schema
`;

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
}
