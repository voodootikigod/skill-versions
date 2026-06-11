import { describe, expect, it } from "vitest";
import {
	computeHmac,
	generateKeyPair,
	signBytes,
	signObject,
	stableStringify,
	verifyBytes,
	verifyHmac,
	verifyObject,
} from "./index.js";

describe("stableStringify", () => {
	it("sorts object keys deterministically", () => {
		expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
		expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
	});

	it("preserves array order", () => {
		expect(stableStringify([3, 1, 2])).toBe("[3,1,2]");
	});

	it("omits undefined values", () => {
		expect(stableStringify({ a: 1, b: undefined })).toBe('{"a":1}');
	});

	it("handles nested objects", () => {
		expect(stableStringify({ z: { y: 1, x: 2 } })).toBe('{"z":{"x":2,"y":1}}');
	});
});

describe("Ed25519 byte signing", () => {
	it("verifies a valid signature", () => {
		const { publicKey, privateKey } = generateKeyPair();
		const sig = signBytes("hello world", privateKey);
		expect(verifyBytes("hello world", sig, publicKey)).toBe(true);
	});

	it("rejects tampered data", () => {
		const { publicKey, privateKey } = generateKeyPair();
		const sig = signBytes("hello world", privateKey);
		expect(verifyBytes("hello mars", sig, publicKey)).toBe(false);
	});

	it("rejects a signature from a different key", () => {
		const a = generateKeyPair();
		const b = generateKeyPair();
		const sig = signBytes("payload", a.privateKey);
		expect(verifyBytes("payload", sig, b.publicKey)).toBe(false);
	});

	it("returns false on malformed input instead of throwing", () => {
		const { publicKey } = generateKeyPair();
		expect(verifyBytes("payload", "not-base64-$$", publicKey)).toBe(false);
		expect(verifyBytes("payload", "AAAA", "not-a-key")).toBe(false);
	});
});

describe("object signing", () => {
	it("signs and verifies an object regardless of key order", () => {
		const { publicKey, privateKey } = generateKeyPair();
		const signed = signObject({ b: 2, a: 1 }, privateKey, "key-1");
		expect(signed.signedBy).toBe("key-1");
		expect(typeof signed.signature).toBe("string");
		// Reordered copy must still verify (canonical form is order-independent).
		const reordered = { a: 1, b: 2, signature: signed.signature, signedBy: signed.signedBy };
		expect(verifyObject(reordered, publicKey)).toBe(true);
	});

	it("rejects a mutated payload", () => {
		const { publicKey, privateKey } = generateKeyPair();
		const signed = signObject({ value: "clean" }, privateKey, "key-1");
		const tampered = { ...signed, value: "evil" };
		expect(verifyObject(tampered, publicKey)).toBe(false);
	});

	it("rejects a swapped key id", () => {
		const { publicKey, privateKey } = generateKeyPair();
		const signed = signObject({ value: "x" }, privateKey, "key-1");
		const swapped = { ...signed, signedBy: "key-2" };
		expect(verifyObject(swapped, publicKey)).toBe(false);
	});

	it("returns false when signature fields are missing", () => {
		const { publicKey } = generateKeyPair();
		expect(verifyObject({ value: "x" }, publicKey)).toBe(false);
	});
});

describe("HMAC", () => {
	const key = "00112233445566778899aabbccddeeff";

	it("computes and verifies a tag", () => {
		const tag = computeHmac("data", key);
		expect(verifyHmac("data", tag, key)).toBe(true);
	});

	it("rejects a tampered tag or data", () => {
		const tag = computeHmac("data", key);
		expect(verifyHmac("data2", tag, key)).toBe(false);
		expect(verifyHmac("data", `${tag.slice(0, -1)}0`, key)).toBe(false);
	});

	it("rejects an empty expected tag", () => {
		expect(verifyHmac("data", "", key)).toBe(false);
	});
});
