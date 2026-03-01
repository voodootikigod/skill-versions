import { describe, expect, it } from "vitest";
import { groupSkills } from "./scanner.js";
import type { ScannedSkill } from "./types.js";

describe("groupSkills", () => {
	it("groups skills with shared prefix and same version", () => {
		const skills: ScannedSkill[] = [
			{ name: "ai-sdk-core", path: "/a", productVersion: "6.0.0" },
			{ name: "ai-sdk-tools", path: "/b", productVersion: "6.0.0" },
			{ name: "ai-sdk-react", path: "/c", productVersion: "6.0.0" },
		];

		const groups = groupSkills(skills);
		expect(groups.size).toBe(1);
		expect(groups.has("ai-sdk")).toBe(true);
		expect(groups.get("ai-sdk")!.length).toBe(3);
	});

	it("separates skills with same prefix but different versions", () => {
		const skills: ScannedSkill[] = [
			{ name: "ai-sdk-core", path: "/a", productVersion: "6.0.0" },
			{ name: "ai-sdk-tools", path: "/b", productVersion: "5.0.0" },
		];

		const groups = groupSkills(skills);
		// Different versions -> no shared prefix match -> each gets its own group
		expect(groups.size).toBe(2);
		expect(groups.has("ai-sdk-core")).toBe(true);
		expect(groups.has("ai-sdk-tools")).toBe(true);
	});

	it("uses full name for standalone skills", () => {
		const skills: ScannedSkill[] = [
			{ name: "mermaid", path: "/a", productVersion: "10.0.0" },
		];

		const groups = groupSkills(skills);
		expect(groups.size).toBe(1);
		expect(groups.has("mermaid")).toBe(true);
	});

	it("skips skills without productVersion", () => {
		const skills: ScannedSkill[] = [
			{ name: "no-version", path: "/a" },
			{ name: "has-version", path: "/b", productVersion: "1.0.0" },
		];

		const groups = groupSkills(skills);
		expect(groups.size).toBe(1);
		expect(groups.has("has-version")).toBe(true);
	});

	it("returns empty map for empty input", () => {
		expect(groupSkills([]).size).toBe(0);
	});

	it("handles mixed groups correctly", () => {
		const skills: ScannedSkill[] = [
			{ name: "ai-sdk-core", path: "/a", productVersion: "6.0.0" },
			{ name: "ai-sdk-tools", path: "/b", productVersion: "6.0.0" },
			{ name: "payload-core", path: "/c", productVersion: "3.0.0" },
			{ name: "payload-admin", path: "/d", productVersion: "3.0.0" },
			{ name: "mermaid", path: "/e", productVersion: "10.0.0" },
		];

		const groups = groupSkills(skills);
		expect(groups.size).toBe(3);
		expect(groups.get("ai-sdk")!.length).toBe(2);
		expect(groups.get("payload")!.length).toBe(2);
		expect(groups.get("mermaid")!.length).toBe(1);
	});
});
