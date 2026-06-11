import { readFile, stat } from "node:fs/promises";
import type { FingerprintEntry, FingerprintRegistry } from "@skills-check/schema";
import { countTokens } from "../budget/tokenizer.js";
import { extractVersionedPackages, parseCompatibility } from "../compatibility/index.js";
import { discoverSkillFiles } from "../shared/discovery.js";
import { signObject, verifyObject } from "../signing/index.js";
import { readSkillFile, writeSkillFile } from "../skill-io.js";
import {
	computeContentHash,
	computeFrontmatterHash,
	computePrefixHash,
	extractRawFrontmatter,
	extractWatermark,
	injectWatermarkIntoContent,
} from "./extractors/hashes.js";

export interface FingerprintOptions {
	ci?: boolean;
	injectWatermarks?: boolean;
	json?: boolean;
	/** Identifier recorded in the registry's `signedBy` field. */
	keyId?: string;
	output?: string;
	/** Path to an Ed25519 PKCS#8 PEM private key; when set, the registry is signed. */
	signKeyPath?: string;
}

/**
 * Resolve the best version for fingerprinting from frontmatter fields.
 * Precedence: version > first versioned compatibility entry > product-version > "0.0.0"
 */
function resolveFingerprintVersion(fm: Record<string, unknown>): string {
	if (typeof fm.version === "string") {
		return fm.version;
	}
	if (typeof fm.compatibility === "string") {
		const versioned = extractVersionedPackages(parseCompatibility(fm.compatibility));
		if (versioned.length > 0 && versioned[0].version) {
			return versioned[0].version;
		}
	}
	if (typeof fm["product-version"] === "string") {
		return fm["product-version"];
	}
	return "0.0.0";
}

/**
 * Run the fingerprint pipeline on skill files.
 *
 * 1. Discover SKILL.md files
 * 2. Parse frontmatter
 * 3. Compute fingerprint hashes
 * 4. Optionally inject watermarks
 * 5. Return FingerprintRegistry
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
export async function runFingerprint(
	paths: string[],
	options: FingerprintOptions = {}
): Promise<FingerprintRegistry> {
	// Discover all skill files
	const allFiles: string[] = [];
	for (const p of paths) {
		try {
			const info = await stat(p);
			if (info.isDirectory()) {
				const discovered = await discoverSkillFiles(p);
				allFiles.push(...discovered);
			} else if (p.endsWith(".md")) {
				allFiles.push(p);
			}
		} catch {
			throw new Error(`Cannot access path: ${p}`);
		}
	}

	const entries: FingerprintEntry[] = [];

	for (const filePath of allFiles) {
		const skillFile = await readSkillFile(filePath);
		const fm = skillFile.frontmatter;
		const name = (fm.name as string) ?? "unknown";
		const version = resolveFingerprintVersion(fm);
		const source = fm.source as string | undefined;

		// Extract raw frontmatter for hashing
		const rawFm = extractRawFrontmatter(skillFile.raw);
		const frontmatterHash = rawFm ? computeFrontmatterHash(rawFm) : computeFrontmatterHash("");

		// Content hashes
		const contentHash = computeContentHash(skillFile.raw);
		const prefixHash = computePrefixHash(skillFile.raw);

		// Watermark
		const watermark = extractWatermark(skillFile.raw);
		let watermarkStr: string | undefined;

		if (watermark) {
			watermarkStr = `skill:${watermark.name}/${watermark.version}${watermark.source ? ` ${watermark.source}` : ""}`;
		}

		// Inject watermark if requested and missing
		if (options.injectWatermarks && !watermark) {
			const result = injectWatermarkIntoContent(skillFile.raw, name, version, source);
			if (result.injected) {
				await writeSkillFile(filePath, result.content);
				watermarkStr = `skill:${name}/${version}${source ? ` ${source}` : ""}`;
			}
		}

		const tokenCount = countTokens(skillFile.raw);

		entries.push({
			skillId: name,
			version,
			source,
			frontmatterHash,
			contentHash,
			prefixHash,
			watermark: watermarkStr,
			tokenCount,
			path: filePath,
		});
	}

	const registry: FingerprintRegistry = {
		version: 1,
		generatedAt: new Date().toISOString(),
		entries,
	};

	// Sign the registry so consumers can detect tampering in transit or at rest.
	if (options.signKeyPath) {
		const privateKey = await readFile(options.signKeyPath, "utf-8");
		const keyId = options.keyId ?? "default";
		return signObject(
			registry as unknown as Record<string, unknown>,
			privateKey,
			keyId
		) as unknown as FingerprintRegistry;
	}

	return registry;
}

/**
 * Verify the Ed25519 signature on a fingerprint registry against a public key.
 * Returns false if the registry is unsigned or the signature does not match.
 */
export function verifyFingerprintRegistry(
	registry: FingerprintRegistry,
	publicKeyPem: string
): boolean {
	return verifyObject(registry as unknown as Record<string, unknown>, publicKeyPem);
}
