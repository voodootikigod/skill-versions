import type { SkillTelemetryEvent } from "@skills-check/schema";
import { estimateCost } from "../budget/cost.js";

export interface SkillUsageStats {
	name: string;
	versions: string[];
	totalCalls: number;
	totalTokens: number;
	avgTokensPerCall: number;
	estimatedCost: number;
	models: Record<string, number>;
	hasVersionDrift: boolean;
}

export interface UsageReport {
	period: { since?: string; until?: string };
	totalCalls: number;
	totalTokens: number;
	totalEstimatedCost: number;
	skills: SkillUsageStats[];
	generatedAt: string;
}

/**
 * Deduplicate events by request.id — same skill detected multiple ways
 * in one request counts once. Keep the highest confidence detection.
 */
function deduplicateEvents(events: SkillTelemetryEvent[]): SkillTelemetryEvent[] {
	const byRequestAndSkill = new Map<string, SkillTelemetryEvent>();

	for (const event of events) {
		const key = `${event.request.id}:${event.skill.name}`;
		const existing = byRequestAndSkill.get(key);
		if (!existing || event.confidence > existing.confidence) {
			byRequestAndSkill.set(key, event);
		}
	}

	return [...byRequestAndSkill.values()];
}

/**
 * Analyze telemetry events into a usage report.
 */
export function analyzeUsage(
	events: SkillTelemetryEvent[],
	options?: { since?: string; until?: string },
): UsageReport {
	const deduplicated = deduplicateEvents(events);

	// Group by skill name
	const bySkill = new Map<string, SkillTelemetryEvent[]>();
	for (const event of deduplicated) {
		const existing = bySkill.get(event.skill.name) ?? [];
		existing.push(event);
		bySkill.set(event.skill.name, existing);
	}

	const skills: SkillUsageStats[] = [];
	let totalCalls = 0;
	let totalTokens = 0;
	let totalCost = 0;

	for (const [name, skillEvents] of bySkill) {
		const versions = [...new Set(skillEvents.map((e) => e.skill.version))].sort();
		const calls = skillEvents.length;
		const tokens = skillEvents.reduce((sum, e) => sum + e.request.skill_tokens, 0);
		const avgTokens = calls > 0 ? Math.round(tokens / calls) : 0;

		// Model distribution
		const models: Record<string, number> = {};
		for (const e of skillEvents) {
			models[e.request.model] = (models[e.request.model] ?? 0) + 1;
		}

		// Cost estimation: use per-call token average with default model
		let cost = 0;
		try {
			cost = estimateCost(tokens, undefined, 1).costPer1KLoads;
		} catch {
			// If cost estimation fails, leave as 0
		}

		totalCalls += calls;
		totalTokens += tokens;
		totalCost += cost;

		skills.push({
			name,
			versions,
			totalCalls: calls,
			totalTokens: tokens,
			avgTokensPerCall: avgTokens,
			estimatedCost: Math.round(cost * 1000) / 1000,
			models,
			hasVersionDrift: versions.length > 1,
		});
	}

	// Sort by totalCalls descending
	skills.sort((a, b) => b.totalCalls - a.totalCalls);

	return {
		period: { since: options?.since, until: options?.until },
		totalCalls,
		totalTokens,
		totalEstimatedCost: Math.round(totalCost * 1000) / 1000,
		skills,
		generatedAt: new Date().toISOString(),
	};
}
