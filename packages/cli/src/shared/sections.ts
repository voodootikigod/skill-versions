/**
 * Represents a section of a SKILL.md file delimited by markdown headings.
 */
export interface SkillSection {
	/** The body content of this section (excluding the heading line itself). */
	content: string;
	/** 1-based line number where this section ends (inclusive). */
	endLine: number;
	/** The heading text (without the leading `#` characters), or empty string for preamble. */
	heading: string;
	/** Heading level: 1 for `#`, 2 for `##`, etc. Level 0 indicates preamble (content before first heading). */
	level: number;
	/** 1-based line number where this section starts. */
	startLine: number;
}

const HEADING_RE = /^(#{1,6})\s+(.+)$/;

/**
 * Parse markdown content into sections split by headings.
 *
 * Returns an array of SkillSection objects. Content before the first heading
 * is returned as a "preamble" section with level 0 and an empty heading.
 * Each section's content excludes the heading line itself but includes all
 * lines up to (but not including) the next heading.
 */
export function parseSections(content: string): SkillSection[] {
	const lines = content.split("\n");
	const sections: SkillSection[] = [];

	let currentHeading = "";
	let currentLevel = 0;
	let currentStartLine = 1;
	let contentLines: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const lineNumber = i + 1;
		const line = lines[i];
		const match = HEADING_RE.exec(line);

		if (match) {
			// Finalize the previous section
			sections.push(
				buildSection(currentHeading, currentLevel, contentLines, currentStartLine, lineNumber - 1)
			);

			// Start a new section
			currentLevel = match[1].length;
			currentHeading = match[2];
			currentStartLine = lineNumber;
			contentLines = [];
		} else {
			contentLines.push(line);
		}
	}

	// Finalize the last section
	sections.push(
		buildSection(currentHeading, currentLevel, contentLines, currentStartLine, lines.length)
	);

	return sections;
}

function buildSection(
	heading: string,
	level: number,
	contentLines: string[],
	startLine: number,
	endLine: number
): SkillSection {
	return {
		heading,
		level,
		content: contentLines.join("\n"),
		startLine,
		endLine: Math.max(startLine, endLine),
	};
}
