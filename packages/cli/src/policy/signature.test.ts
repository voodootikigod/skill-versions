import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateKeyPair } from "../signing/index.js";
import { signaturePathFor, signPolicyFile, verifyPolicyFile } from "./signature.js";

const POLICY = "version: 1\nsources:\n  allow:\n    - '@acme/*'\n";

describe("policy signatures", () => {
	let dir: string;
	let policyPath: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "policy-sig-"));
		policyPath = join(dir, ".skill-policy.yml");
		await writeFile(policyPath, POLICY, "utf-8");
	});

	afterEach(async () => {
		const { rm } = await import("node:fs/promises");
		await rm(dir, { recursive: true, force: true });
	});

	it("signs a policy and verifies it under the public key", async () => {
		const { publicKey, privateKey } = generateKeyPair();
		const sigPath = await signPolicyFile(policyPath, privateKey, "ci-key");
		expect(sigPath).toBe(signaturePathFor(policyPath));

		const result = await verifyPolicyFile(policyPath, publicKey);
		expect(result.valid).toBe(true);
		expect(result.keyId).toBe("ci-key");
	});

	it("fails closed when no signature sidecar exists", async () => {
		const { publicKey } = generateKeyPair();
		const result = await verifyPolicyFile(policyPath, publicKey);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain("No signature file");
	});

	it("fails when the policy is modified after signing", async () => {
		const { publicKey, privateKey } = generateKeyPair();
		await signPolicyFile(policyPath, privateKey, "ci-key");
		await writeFile(policyPath, `${POLICY}    - '@evil/*'\n`, "utf-8");

		const result = await verifyPolicyFile(policyPath, publicKey);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain("does not match");
	});

	it("fails when verified under the wrong public key", async () => {
		const signer = generateKeyPair();
		const attacker = generateKeyPair();
		await signPolicyFile(policyPath, signer.privateKey, "ci-key");

		const result = await verifyPolicyFile(policyPath, attacker.publicKey);
		expect(result.valid).toBe(false);
	});
});
