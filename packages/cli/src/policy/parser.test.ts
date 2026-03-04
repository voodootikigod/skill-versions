import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discoverPolicyFile, parsePolicy, validatePolicy } from "./parser.js";

describe("parsePolicy", () => {
	it("parses a valid minimal policy", async () => {
		const policy = await parsePolicy("version: 1\n");
		expect(policy.version).toBe(1);
	});

	it("parses a full policy", async () => {
		const yaml = `
version: 1
sources:
  allow:
    - "our-org/*"
  deny:
    - "untrusted/*"
required:
  - skill: "coding-standards"
    source: "our-org/skills"
banned:
  - skill: "deploy-yolo"
    reason: "Unsafe deployment"
metadata:
  required_fields:
    - name
    - description
  require_license: true
  allowed_licenses:
    - MIT
    - Apache-2.0
content:
  deny_patterns:
    - pattern: "curl.*\\\\|.*bash"
      reason: "No pipe to bash"
  require_patterns:
    - pattern: "## Error Handling"
      reason: "Must document errors"
freshness:
  max_age_days: 90
  max_version_drift: minor
  require_product_version: true
audit:
  require_clean: true
  min_severity_to_block: high
`;
		const policy = await parsePolicy(yaml);
		expect(policy.version).toBe(1);
		expect(policy.sources?.allow).toEqual(["our-org/*"]);
		expect(policy.sources?.deny).toEqual(["untrusted/*"]);
		expect(policy.required).toHaveLength(1);
		expect(policy.banned).toHaveLength(1);
		expect(policy.metadata?.required_fields).toEqual(["name", "description"]);
		expect(policy.metadata?.require_license).toBe(true);
		expect(policy.content?.deny_patterns).toHaveLength(1);
		expect(policy.content?.require_patterns).toHaveLength(1);
		expect(policy.freshness?.max_age_days).toBe(90);
		expect(policy.freshness?.max_version_drift).toBe("minor");
		expect(policy.audit?.require_clean).toBe(true);
		expect(policy.audit?.min_severity_to_block).toBe("high");
	});

	it("throws on empty content", async () => {
		await expect(parsePolicy("")).rejects.toThrow("empty or not a valid YAML");
	});

	it("throws on non-object YAML", async () => {
		await expect(parsePolicy("just a string")).rejects.toThrow("empty or not a valid YAML");
	});

	it("throws on missing version", async () => {
		await expect(parsePolicy("sources:\n  allow: []\n")).rejects.toThrow(
			'must have a numeric "version"'
		);
	});

	it("throws on unsupported version", async () => {
		await expect(parsePolicy("version: 2\n")).rejects.toThrow("Unsupported policy version: 2");
	});
});

describe("validatePolicy", () => {
	it("returns no errors for a valid policy", () => {
		const errors = validatePolicy({ version: 1 });
		expect(errors).toEqual([]);
	});

	it("catches invalid sources.allow", () => {
		const errors = validatePolicy({
			version: 1,
			sources: { allow: "not-an-array" as unknown as string[] },
		});
		expect(errors).toContain("sources.allow must be an array of strings");
	});

	it("catches invalid required entry", () => {
		const errors = validatePolicy({
			version: 1,
			required: [{ skill: "" }],
		});
		expect(errors.some((e) => e.includes('must have a "skill"'))).toBe(true);
	});

	it("catches invalid banned entry", () => {
		const errors = validatePolicy({
			version: 1,
			banned: [{ skill: "" }],
		});
		expect(errors.some((e) => e.includes('must have a "skill"'))).toBe(true);
	});

	it("catches invalid regex in deny_patterns", () => {
		const errors = validatePolicy({
			version: 1,
			content: {
				deny_patterns: [{ pattern: "[invalid(", reason: "test" }],
			},
		});
		expect(errors.some((e) => e.includes("invalid regex"))).toBe(true);
	});

	it("catches missing reason in deny_patterns", () => {
		const errors = validatePolicy({
			version: 1,
			content: {
				deny_patterns: [{ pattern: "test", reason: "" }],
			},
		});
		expect(errors.some((e) => e.includes('must have a "reason"'))).toBe(true);
	});

	it("catches invalid max_version_drift", () => {
		const errors = validatePolicy({
			version: 1,
			freshness: { max_version_drift: "invalid" as "major" },
		});
		expect(errors.some((e) => e.includes("max_version_drift"))).toBe(true);
	});

	it("catches invalid min_severity_to_block", () => {
		const errors = validatePolicy({
			version: 1,
			audit: { min_severity_to_block: "invalid" as "high" },
		});
		expect(errors.some((e) => e.includes("min_severity_to_block"))).toBe(true);
	});
});

describe("discoverPolicyFile", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "policy-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	it("finds .skill-policy.yml in the given directory", async () => {
		const policyPath = join(tempDir, ".skill-policy.yml");
		await writeFile(policyPath, "version: 1\n");

		const found = await discoverPolicyFile(tempDir);
		expect(found).toBe(policyPath);
	});

	it("finds .skill-policy.yml in a parent directory", async () => {
		const policyPath = join(tempDir, ".skill-policy.yml");
		await writeFile(policyPath, "version: 1\n");

		const { mkdir } = await import("node:fs/promises");
		const subDir = join(tempDir, "sub", "deep");
		await mkdir(subDir, { recursive: true });

		const found = await discoverPolicyFile(subDir);
		expect(found).toBe(policyPath);
	});

	it("returns null when no policy file exists", async () => {
		const found = await discoverPolicyFile(tempDir);
		expect(found).toBeNull();
	});
});
