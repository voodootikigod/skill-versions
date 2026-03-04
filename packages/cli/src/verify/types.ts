export type VersionBump = "major" | "minor" | "patch";

export interface ChangeSignal {
	type: VersionBump;
	reason: string;
	confidence: number;
	source: "heuristic" | "llm";
}

export interface VerifyResult {
	skill: string;
	file: string;
	declaredBefore: string | null;
	declaredAfter: string | null;
	declaredBump: VersionBump | null;
	assessedBump: VersionBump;
	match: boolean;
	signals: ChangeSignal[];
	explanation: string;
	llmUsed: boolean;
}

export interface VerifyReport {
	results: VerifyResult[];
	summary: { passed: number; failed: number; skipped: number };
	generatedAt: string;
}

export interface VerifyOptions {
	skill?: string;
	all?: boolean;
	before?: string;
	after?: string;
	suggest?: boolean;
	format?: "terminal" | "json";
	output?: string;
	provider?: string;
	model?: string;
	skipLlm?: boolean;
}
