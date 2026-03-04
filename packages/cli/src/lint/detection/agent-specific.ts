/**
 * Detect whether a skill file contains agent-specific instructions.
 *
 * Returns true if the content references specific AI coding agents by name,
 * indicating the skill should declare which agents it targets via the `agents`
 * frontmatter field.
 */

const AGENT_PATTERNS = [
	// Direct agent name references
	/\b(?:claude[- ]?code)\b/i,
	/\b(?:cursor)\b(?:\s+(?:ide|editor|agent|rules?))/i,
	/\b(?:codex)\b(?:\s+(?:agent|cli))?/i,
	/\b(?:copilot)\b(?:\s+(?:workspace|chat|agent))?/i,
	/\b(?:windsurf)\b/i,
	/\b(?:aider)\b/i,
	/\b(?:cline)\b/i,
	/\b(?:continue\.dev|continue\s+agent)\b/i,
	/\b(?:devin)\b/i,

	// Contextual patterns: "In <agent>", "For <agent>", "When using <agent>"
	/\b(?:in|for|with|using)\s+(?:claude[- ]?code|cursor|codex|copilot|windsurf|aider|cline|devin)\b/i,

	// Agent-specific file patterns
	/\.cursorrules\b/,
	/\.claude(?:rc|\.md|\/)\b/,
	/AGENTS\.md\b/,

	// Agent-specific instruction markers
	/\b(?:agent[- ]?specific|agent[- ]?only)\b/i,
];

export function detectsAgentSpecific(content: string): boolean {
	return AGENT_PATTERNS.some((pattern) => pattern.test(content));
}
