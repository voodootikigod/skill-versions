export interface SectionBudget {
	/** The heading text of the section. Empty string for preamble. */
	heading: string;
	/** Percentage of the skill's total tokens. */
	percentage: number;
	/** Number of tokens in this section. */
	tokens: number;
}

export interface SkillBudget {
	/** Name from frontmatter, or filename fallback. */
	name: string;
	/** Path to the skill file. */
	path: string;
	/** Per-section token breakdown. */
	sections: SectionBudget[];
	/** Total token count for the entire skill. */
	totalTokens: number;
}

export interface RedundancyMatch {
	/** Name of the first skill. */
	nameA: string;
	/** Name of the second skill. */
	nameB: string;
	/** Estimated number of overlapping tokens. */
	overlapTokens: number;
	/** Jaccard similarity score (0-1). */
	similarity: number;
	/** Path to the first skill. */
	skillA: string;
	/** Path to the second skill. */
	skillB: string;
	/** Actionable suggestion for the user. */
	suggestion: string;
}

export interface CostEstimate {
	/** Cost per 1,000 skill loads (input tokens only). */
	costPer1KLoads: number;
	/** Model name used for pricing. */
	model: string;
	/** Number of tokens priced. */
	tokens: number;
}

export interface BudgetReport {
	/** Context window size used for percentage calculations. */
	contextWindow: number;
	/** Cost estimate for the total. */
	cost: CostEstimate;
	/** ISO timestamp of report generation. */
	generatedAt: string;
	/** Redundancy matches above threshold. */
	redundancy: RedundancyMatch[];
	/** Individual skill budgets. */
	skills: SkillBudget[];
	/** Total tokens across all skills. */
	totalTokens: number;
}

export interface BudgetSnapshot {
	/** ISO timestamp of the snapshot. */
	generatedAt: string;
	/** Model used for cost estimation. */
	model: string;
	/** Skill budgets at the time of the snapshot. */
	skills: SkillBudget[];
	/** Total tokens at the time of the snapshot. */
	totalTokens: number;
}

export interface BudgetDiff {
	/** Token count after. */
	after: number;
	/** Token count before. */
	before: number;
	/** Absolute change in tokens. */
	delta: number;
	/** Percentage change. */
	percentChange: number;
	/** Skill name. */
	skill: string;
}

export interface BudgetOptions {
	/** Compare against a snapshot at this path. */
	compare?: string;
	/** Show per-section breakdown. */
	detailed?: boolean;
	/** Output format. */
	format?: "terminal" | "json" | "markdown";
	/** Maximum tokens threshold for CI. */
	maxTokens?: number;
	/** Model for cost estimation. */
	model?: string;
	/** Write output to this file. */
	output?: string;
	/** Save snapshot to this path. */
	save?: string;
	/** Filter to a specific skill by name. */
	skill?: string;
}
