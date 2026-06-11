import {
	createHmac,
	createPublicKey,
	sign as cryptoSign,
	verify as cryptoVerify,
	generateKeyPairSync,
	timingSafeEqual,
} from "node:crypto";

/**
 * Cryptographic signing primitives for skills-check integrity artifacts.
 *
 * Uses Node's built-in Ed25519 (no third-party dependency). Two shapes are
 * supported:
 *   - In-band object signing (e.g. the fingerprint registry): a `signature`
 *     and `signedBy` field are embedded in the JSON, computed over a canonical
 *     serialization that excludes those fields.
 *   - Detached byte signing (e.g. a `.skill-policy.yml`): the signature lives
 *     in a sidecar file so the signed document is never mutated.
 */

const SIGNATURE_KEYS = ["signature", "signedBy"] as const;

export interface Ed25519KeyPair {
	/** PKCS#8 PEM private key. */
	privateKey: string;
	/** SPKI PEM public key. */
	publicKey: string;
}

/** Generate an Ed25519 key pair as PEM strings. */
export function generateKeyPair(): Ed25519KeyPair {
	const { publicKey, privateKey } = generateKeyPairSync("ed25519");
	return {
		publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
		privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
	};
}

/**
 * Deterministic JSON serialization: object keys are sorted recursively so the
 * same logical value always produces the same bytes. Arrays keep their order.
 */
export function stableStringify(value: unknown): string {
	if (value === null || typeof value !== "object") {
		return JSON.stringify(value) ?? "null";
	}
	if (Array.isArray(value)) {
		return `[${value.map(stableStringify).join(",")}]`;
	}
	const obj = value as Record<string, unknown>;
	const keys = Object.keys(obj).sort();
	const parts = keys
		.filter((k) => obj[k] !== undefined)
		.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
	return `{${parts.join(",")}}`;
}

/** Sign raw bytes with an Ed25519 PKCS#8 PEM private key; returns base64. */
export function signBytes(data: string | Buffer, privateKeyPem: string): string {
	const buf = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
	// Ed25519 requires the algorithm argument to be null.
	return cryptoSign(null, buf, privateKeyPem).toString("base64");
}

/** Verify a base64 Ed25519 signature over raw bytes. Never throws. */
export function verifyBytes(
	data: string | Buffer,
	signatureB64: string,
	publicKeyPem: string
): boolean {
	try {
		const buf = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
		const key = createPublicKey({ key: publicKeyPem });
		return cryptoVerify(null, buf, key, Buffer.from(signatureB64, "base64"));
	} catch {
		return false;
	}
}

/**
 * Return a copy of `obj` with an embedded Ed25519 signature over its canonical
 * form (excluding the signature fields themselves). `keyId` is recorded in
 * `signedBy` so verifiers can select the right public key.
 */
export function signObject<T extends Record<string, unknown>>(
	obj: T,
	privateKeyPem: string,
	keyId: string
): T & { signature: string; signedBy: string } {
	const unsigned = stripKeys(obj, SIGNATURE_KEYS);
	// Bind the key id into the signed payload so it cannot be swapped.
	const payload = stableStringify({ ...unsigned, signedBy: keyId });
	const signature = signBytes(payload, privateKeyPem);
	return { ...obj, signedBy: keyId, signature };
}

/**
 * Verify an object signed by {@link signObject}. Returns false if the signature
 * is missing, malformed, or does not match under `publicKeyPem`.
 */
export function verifyObject(obj: Record<string, unknown>, publicKeyPem: string): boolean {
	const signature = obj.signature;
	const signedBy = obj.signedBy;
	if (typeof signature !== "string" || typeof signedBy !== "string") {
		return false;
	}
	const unsigned = stripKeys(obj, SIGNATURE_KEYS);
	const payload = stableStringify({ ...unsigned, signedBy });
	return verifyBytes(payload, signature, publicKeyPem);
}

/** Compute a hex HMAC-SHA256 tag over `data` with a hex key. */
export function computeHmac(data: string, keyHex: string): string {
	return createHmac("sha256", Buffer.from(keyHex, "hex")).update(data, "utf-8").digest("hex");
}

/** Constant-time comparison of a computed HMAC against an expected hex tag. */
export function verifyHmac(data: string, expectedHex: string, keyHex: string): boolean {
	const actual = computeHmac(data, keyHex);
	const a = Buffer.from(actual, "hex");
	const b = Buffer.from(expectedHex, "hex");
	if (a.length !== b.length || a.length === 0) {
		return false;
	}
	return timingSafeEqual(a, b);
}

function stripKeys(obj: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
	const copy: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) {
		if (!keys.includes(k)) {
			copy[k] = v;
		}
	}
	return copy;
}
