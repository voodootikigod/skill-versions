import { parseSections, type SkillSection } from "../../shared/sections.js";

export interface StructuralDiff {
	sectionsAdded: string[];
	sectionsRemoved: string[];
	sectionsModified: string[];
	codeBlocksBefore: number;
	codeBlocksAfter: number;
	codeBlocksDelta: number;
}

const FENCE_RE = /^```\w*/;

function countCodeBlocks(content: string): number {
	let count = 0;
	let inside = false;
	for (const line of content.split("\n")) {
		if (FENCE_RE.test(line.trim())) {
			if (inside) {
				inside = false;
			} else {
				count++;
				inside = true;
			}
		}
	}
	return count;
}

function normalizeHeading(heading: string): string {
	return heading.trim().toLowerCase();
}

function buildHeadingMap(sections: SkillSection[]): Map<string, SkillSection> {
	const map = new Map<string, SkillSection>();
	for (const section of sections) {
		if (section.heading) {
			map.set(normalizeHeading(section.heading), section);
		}
	}
	return map;
}

/**
 * Compare two skill file contents at the structural level.
 * Returns which sections were added, removed, or modified, plus code block counts.
 */
export function structuralDiff(before: string, after: string): StructuralDiff {
	const beforeSections = parseSections(before);
	const afterSections = parseSections(after);

	const beforeMap = buildHeadingMap(beforeSections);
	const afterMap = buildHeadingMap(afterSections);

	const sectionsAdded: string[] = [];
	const sectionsRemoved: string[] = [];
	const sectionsModified: string[] = [];

	// Find removed and modified sections
	for (const [key, beforeSection] of beforeMap) {
		const afterSection = afterMap.get(key);
		if (!afterSection) {
			sectionsRemoved.push(beforeSection.heading);
		} else if (beforeSection.content.trim() !== afterSection.content.trim()) {
			sectionsModified.push(afterSection.heading);
		}
	}

	// Find added sections
	for (const [key, afterSection] of afterMap) {
		if (!beforeMap.has(key)) {
			sectionsAdded.push(afterSection.heading);
		}
	}

	const codeBlocksBefore = countCodeBlocks(before);
	const codeBlocksAfter = countCodeBlocks(after);

	return {
		sectionsAdded,
		sectionsRemoved,
		sectionsModified,
		codeBlocksBefore,
		codeBlocksAfter,
		codeBlocksDelta: codeBlocksAfter - codeBlocksBefore,
	};
}
