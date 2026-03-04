import type { AgentExecution } from "../types.js";
import type { AgentHarness } from "./interface.js";

/**
 * Mock agent harness for testing the test runner itself.
 * Returns preconfigured responses for deterministic test behavior.
 */
export class MockHarness implements AgentHarness {
	readonly name = "mock";
	private readonly responses: Map<string, AgentExecution> = new Map();
	private readonly defaultResponse: AgentExecution;
	executionLog: Array<{ prompt: string; options: Record<string, unknown> }> = [];

	constructor(defaultResponse?: Partial<AgentExecution>) {
		this.defaultResponse = {
			exitCode: 0,
			transcript: "",
			filesCreated: [],
			duration: 100,
			...defaultResponse,
		};
	}

	/**
	 * Register a response for a specific prompt.
	 */
	addResponse(prompt: string, response: Partial<AgentExecution>): void {
		this.responses.set(prompt, { ...this.defaultResponse, ...response });
	}

	// biome-ignore lint/suspicious/useAwait: interface contract requires async
	async available(): Promise<boolean> {
		return true;
	}

	// biome-ignore lint/suspicious/useAwait: interface contract requires async
	async execute(
		prompt: string,
		options: { workDir: string; timeout: number; skills?: string[] }
	): Promise<AgentExecution> {
		this.executionLog.push({ prompt, options: { ...options } });
		return this.responses.get(prompt) ?? this.defaultResponse;
	}

	/**
	 * Reset all registered responses and the execution log.
	 */
	reset(): void {
		this.responses.clear();
		this.executionLog = [];
	}
}
