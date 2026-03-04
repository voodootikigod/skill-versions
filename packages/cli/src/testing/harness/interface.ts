import type { AgentExecution } from "../types.js";

/**
 * Abstract interface for running agent prompts.
 * Implementations wrap specific agent CLIs (Claude Code, Codex, etc.)
 * or provide mock responses for testing.
 */
export interface AgentHarness {
	name: string;
	available(): Promise<boolean>;
	execute(
		prompt: string,
		options: {
			workDir: string;
			timeout: number;
			skills?: string[];
		},
	): Promise<AgentExecution>;
}
