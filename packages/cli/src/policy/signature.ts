import { readFile, writeFile } from "node:fs/promises";
import { signBytes, verifyBytes } from "../signing/index.js";

/**
 * Detached signatures for policy files.
 *
 * A `.skill-policy.yml` is signed by writing a sidecar `<path>.sig` so the
 * policy document itself is never mutated. The signature covers the exact raw
 * bytes of the policy file, so any in-transit or at-rest tampering is detected.
 */

interface PolicySignature {
	keyId: string;
	signature: string;
}

export function signaturePathFor(policyPath: string): string {
	return `${policyPath}.sig`;
}

/** Sign a policy file's raw bytes and write the detached `<path>.sig` sidecar. */
export async function signPolicyFile(
	policyPath: string,
	privateKeyPem: string,
	keyId: string
): Promise<string> {
	const content = await readFile(policyPath);
	const signature = signBytes(content, privateKeyPem);
	const sigPath = signaturePathFor(policyPath);
	const payload: PolicySignature = { keyId, signature };
	await writeFile(sigPath, JSON.stringify(payload, null, 2), "utf-8");
	return sigPath;
}

export interface PolicyVerificationResult {
	keyId?: string;
	reason?: string;
	valid: boolean;
}

/**
 * Verify a policy file against its detached `<path>.sig` sidecar and a public
 * key. Fails closed: a missing or malformed sidecar returns `valid: false`.
 */
export async function verifyPolicyFile(
	policyPath: string,
	publicKeyPem: string
): Promise<PolicyVerificationResult> {
	const sigPath = signaturePathFor(policyPath);
	let sig: PolicySignature;
	try {
		sig = JSON.parse(await readFile(sigPath, "utf-8")) as PolicySignature;
	} catch {
		return { valid: false, reason: `No signature file at ${sigPath}` };
	}
	if (typeof sig.signature !== "string") {
		return { valid: false, reason: "Signature file is malformed" };
	}
	const content = await readFile(policyPath);
	const valid = verifyBytes(content, sig.signature, publicKeyPem);
	return valid
		? { valid: true, keyId: sig.keyId }
		: { valid: false, keyId: sig.keyId, reason: "Signature does not match policy content" };
}
