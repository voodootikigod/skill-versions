import { describe, expect, it } from "vitest";
import type { PackageDiff } from "../diff/packages.js";
import type { StructuralDiff } from "../diff/structural.js";
import { classifyHeuristic, highestBump } from "./heuristics.js";

function makeInput(overrides?: {
	structural?: Partial<StructuralDiff>;
	packages?: Partial<PackageDiff>;
	similarity?: number;
	onlyVersions?: boolean;
	onlyUrls?: boolean;
	beforeContent?: string;
	afterContent?: string;
}) {
	return {
		structural: {
			sectionsAdded: [],
			sectionsRemoved: [],
			sectionsModified: [],
			codeBlocksBefore: 0,
			codeBlocksAfter: 0,
			codeBlocksDelta: 0,
			...overrides?.structural,
		},
		packages: {
			added: [],
			removed: [],
			renamed: [],
			...overrides?.packages,
		},
		similarity: overrides?.similarity ?? 0.5,
		onlyVersions: overrides?.onlyVersions ?? false,
		onlyUrls: overrides?.onlyUrls ?? false,
		beforeContent: overrides?.beforeContent ?? "before content",
		afterContent: overrides?.afterContent ?? "after content",
	};
}

describe("classifyHeuristic", () => {
	it("signals major for package renames", () => {
		const signals = classifyHeuristic(
			makeInput({
				packages: {
					renamed: [{ before: "@vercel/deploy", after: "vercel-deploy", ecosystem: "npm" }],
				},
			}),
		);

		const majorSignals = signals.filter((s) => s.type === "major");
		expect(majorSignals.length).toBeGreaterThan(0);
		expect(majorSignals[0].confidence).toBe(0.9);
		expect(majorSignals[0].reason).toContain("renamed");
	});

	it("signals major for removed packages", () => {
		const signals = classifyHeuristic(
			makeInput({
				packages: {
					removed: [{ name: "old-pkg", ecosystem: "npm", line: 1, source: "npm install old-pkg" }],
				},
			}),
		);

		const majorSignals = signals.filter((s) => s.type === "major");
		expect(majorSignals.length).toBeGreaterThan(0);
		expect(majorSignals[0].confidence).toBe(0.8);
	});

	it("signals major for removed sections", () => {
		const signals = classifyHeuristic(
			makeInput({
				structural: { sectionsRemoved: ["Getting Started"] },
			}),
		);

		const majorSignals = signals.filter((s) => s.type === "major");
		expect(majorSignals.length).toBeGreaterThan(0);
	});

	it("signals major for 'deprecated' text in new content", () => {
		const signals = classifyHeuristic(
			makeInput({
				beforeContent: "# My Skill\n\nUse this function.\n",
				afterContent: "# My Skill\n\nThis function is deprecated. Use the new one.\n",
			}),
		);

		const majorSignals = signals.filter((s) => s.type === "major");
		expect(majorSignals.length).toBeGreaterThan(0);
		expect(majorSignals[0].confidence).toBe(0.7);
	});

	it("signals minor for added sections", () => {
		const signals = classifyHeuristic(
			makeInput({
				structural: { sectionsAdded: ["Server Actions", "Edge Runtime"] },
			}),
		);

		const minorSignals = signals.filter((s) => s.type === "minor");
		expect(minorSignals.length).toBeGreaterThan(0);
		expect(minorSignals[0].confidence).toBe(0.8);
	});

	it("signals minor for increased code blocks", () => {
		const signals = classifyHeuristic(
			makeInput({
				structural: { codeBlocksDelta: 3 },
			}),
		);

		const minorSignals = signals.filter((s) => s.type === "minor");
		expect(minorSignals.length).toBeGreaterThan(0);
		expect(minorSignals[0].confidence).toBe(0.6);
	});

	it("signals patch for only version number changes", () => {
		const signals = classifyHeuristic(
			makeInput({
				onlyVersions: true,
				similarity: 0.99,
			}),
		);

		const patchSignals = signals.filter((s) => s.type === "patch");
		expect(patchSignals.length).toBeGreaterThan(0);
		expect(patchSignals.some((s) => s.confidence === 0.8)).toBe(true);
	});

	it("signals patch for only URL changes", () => {
		const signals = classifyHeuristic(
			makeInput({
				onlyUrls: true,
			}),
		);

		const patchSignals = signals.filter((s) => s.type === "patch");
		expect(patchSignals.length).toBeGreaterThan(0);
	});

	it("signals patch for high content similarity", () => {
		const signals = classifyHeuristic(
			makeInput({
				similarity: 0.98,
			}),
		);

		const patchSignals = signals.filter((s) => s.type === "patch");
		expect(patchSignals.length).toBeGreaterThan(0);
		expect(patchSignals[0].confidence).toBe(0.7);
	});

	it("returns a default patch signal when no rules match", () => {
		const signals = classifyHeuristic(
			makeInput({
				similarity: 0.5,
				beforeContent: "alpha",
				afterContent: "beta",
			}),
		);

		expect(signals.length).toBeGreaterThan(0);
		expect(signals[0].type).toBe("patch");
		expect(signals[0].confidence).toBe(0.5);
	});

	it("returns multiple signals for complex changes", () => {
		const signals = classifyHeuristic(
			makeInput({
				structural: {
					sectionsAdded: ["New Feature"],
					sectionsRemoved: ["Old Feature"],
				},
				packages: {
					renamed: [{ before: "old-pkg", after: "new-pkg", ecosystem: "npm" }],
				},
			}),
		);

		const majorSignals = signals.filter((s) => s.type === "major");
		const minorSignals = signals.filter((s) => s.type === "minor");
		expect(majorSignals.length).toBeGreaterThan(0);
		expect(minorSignals.length).toBeGreaterThan(0);
	});
});

describe("highestBump", () => {
	it("returns major when major signal is present", () => {
		const result = highestBump([
			{ type: "patch", reason: "small", confidence: 0.9, source: "heuristic" },
			{ type: "major", reason: "big", confidence: 0.7, source: "heuristic" },
		]);
		expect(result.bump).toBe("major");
	});

	it("returns minor when no major signals", () => {
		const result = highestBump([
			{ type: "patch", reason: "small", confidence: 0.9, source: "heuristic" },
			{ type: "minor", reason: "medium", confidence: 0.8, source: "heuristic" },
		]);
		expect(result.bump).toBe("minor");
	});

	it("returns patch when only patch signals", () => {
		const result = highestBump([
			{ type: "patch", reason: "small", confidence: 0.9, source: "heuristic" },
		]);
		expect(result.bump).toBe("patch");
	});

	it("prefers higher confidence at same bump level", () => {
		const result = highestBump([
			{ type: "minor", reason: "low", confidence: 0.5, source: "heuristic" },
			{ type: "minor", reason: "high", confidence: 0.9, source: "heuristic" },
		]);
		expect(result.confidence).toBe(0.9);
	});
});
