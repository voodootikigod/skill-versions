import { readFile, writeFile } from "node:fs/promises";
import matter from "gray-matter";

export interface SkillFile {
	content: string;
	frontmatter: Record<string, unknown>;
	path: string;
	raw: string;
}

/**
 * Read a SKILL.md file and parse its frontmatter.
 */
export async function readSkillFile(filePath: string): Promise<SkillFile> {
	const raw = await readFile(filePath, "utf-8");
	const { data, content } = matter(raw);

	return {
		path: filePath,
		frontmatter: data,
		content,
		raw,
	};
}

/**
 * Write updated content to a SKILL.md file.
 */
export async function writeSkillFile(filePath: string, content: string): Promise<void> {
	await writeFile(filePath, content, "utf-8");
}
