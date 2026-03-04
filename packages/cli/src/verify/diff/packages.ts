import { extractPackages } from "../../audit/extractors/packages.js";
import type { ExtractedPackage } from "../../audit/types.js";

export interface PackageDiff {
	added: ExtractedPackage[];
	removed: ExtractedPackage[];
	renamed: Array<{ before: string; after: string; ecosystem: string }>;
}

/**
 * Compare package references between two versions of a skill file.
 * Detects added, removed, and renamed packages using the audit package extractor.
 */
export function packageDiff(before: string, after: string): PackageDiff {
	const beforePkgs = extractPackages(before);
	const afterPkgs = extractPackages(after);

	const beforeNames = new Set(beforePkgs.map((p) => `${p.ecosystem}:${p.name}`));
	const afterNames = new Set(afterPkgs.map((p) => `${p.ecosystem}:${p.name}`));

	const addedSet = afterPkgs.filter((p) => !beforeNames.has(`${p.ecosystem}:${p.name}`));
	const removedSet = beforePkgs.filter((p) => !afterNames.has(`${p.ecosystem}:${p.name}`));

	// Detect renames: a removed package in the same ecosystem with a similar position
	// paired with an added package
	const renamed: Array<{ before: string; after: string; ecosystem: string }> = [];
	const usedAdded = new Set<number>();

	for (const rem of removedSet) {
		for (let i = 0; i < addedSet.length; i++) {
			if (usedAdded.has(i)) continue;
			const add = addedSet[i];
			if (add.ecosystem === rem.ecosystem) {
				renamed.push({ before: rem.name, after: add.name, ecosystem: rem.ecosystem });
				usedAdded.add(i);
				break;
			}
		}
	}

	// Filter out renamed packages from added/removed
	const renamedBeforeNames = new Set(renamed.map((r) => `${r.ecosystem}:${r.before}`));
	const renamedAfterNames = new Set(renamed.map((r) => `${r.ecosystem}:${r.after}`));

	return {
		added: addedSet.filter((p) => !renamedAfterNames.has(`${p.ecosystem}:${p.name}`)),
		removed: removedSet.filter((p) => !renamedBeforeNames.has(`${p.ecosystem}:${p.name}`)),
		renamed,
	};
}
