import { stat } from "node:fs/promises";
import type { FingerprintEntry, FingerprintRegistry } from "@skills-check/schema";
import { countTokens } from "../budget/tokenizer.js";
import { discoverSkillFiles } from "../shared/discovery.js";
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
	output?: string;
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
		const version = (fm.version as string) ?? (fm["product-version"] as string) ?? "0.0.0";
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
			name,
			version,
			source,
			fingerprints: {
				watermark: watermarkStr,
				frontmatter_sha256: frontmatterHash,
				content_sha256: contentHash,
				content_prefix_sha256: prefixHash,
			},
			token_count: tokenCount,
			path: filePath,
		});
	}

	return {
		version: 1,
		generated: new Date().toISOString(),
		skills: entries,
	};
}
