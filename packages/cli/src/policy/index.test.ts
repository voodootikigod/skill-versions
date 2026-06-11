import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runPolicyCheck } from "./index.js";
import type { SkillPolicy } from "./types.js";

describe("runPolicyCheck exemptions", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "policy-exempt-"));
		const skillDir = join(dir, "skills", "yolo");
		await mkdir(skillDir, { recursive: true });
		await writeFile(
			join(skillDir, "SKILL.md"),
			"---\nname: yolo\ndescription: A risky skill\n---\n# Yolo\n",
			"utf-8"
		);
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	const banned: SkillPolicy = { version: 1, banned: [{ skill: "yolo", reason: "unsafe" }] };

	it("blocks a banned skill with no exemption", async () => {
		const report = await runPolicyCheck([dir], banned, "test", {});
		expect(report.findings.some((f) => f.rule === "banned")).toBe(true);
		expect(report.exempted).toHaveLength(0);
	});

	it("waives the banned finding with an active exemption and records it", async () => {
		const policy: SkillPolicy = {
			...banned,
			exemptions: [{ rule: "banned", reason: "migration in progress", expires: "2099-01-01" }],
		};
		const report = await runPolicyCheck([dir], policy, "test", {});
		expect(report.findings.some((f) => f.rule === "banned")).toBe(false);
		expect(report.exempted.some((f) => f.rule === "banned")).toBe(true);
		expect(report.summary.blocked).toBe(0);
	});

	it("does not waive with an expired exemption and surfaces an expiry warning", async () => {
		const policy: SkillPolicy = {
			...banned,
			exemptions: [{ rule: "banned", reason: "lapsed", expires: "2000-01-01" }],
		};
		const report = await runPolicyCheck([dir], policy, "test", {});
		expect(report.findings.some((f) => f.rule === "banned")).toBe(true);
		expect(report.findings.some((f) => f.rule === "exemption.expired")).toBe(true);
		expect(report.exempted).toHaveLength(0);
	});

	it("honors a skill-scoped exemption glob", async () => {
		const policy: SkillPolicy = {
			...banned,
			exemptions: [{ rule: "banned", reason: "approved", skill: "yo*" }],
		};
		const report = await runPolicyCheck([dir], policy, "test", {});
		expect(report.exempted.some((f) => f.rule === "banned")).toBe(true);
	});
});
