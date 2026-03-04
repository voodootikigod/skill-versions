import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * Recursively discover SKILL.md files in a directory.
 *
 * Walks the directory tree looking for SKILL.md files. When a directory
 * contains a SKILL.md, that file is collected and the directory is not
 * recursed further. Results are returned sorted alphabetically.
 */
export async function discoverSkillFiles(dir: string): Promise<string[]> {
	const files: string[] = [];

	let entries: string[];
	try {
		entries = await readdir(dir);
	} catch {
		throw new Error(`Cannot read directory: ${dir}`);
	}

	for (const entry of entries) {
		const fullPath = join(dir, entry);
		try {
			const info = await stat(fullPath);
			if (info.isDirectory()) {
				const skillPath = join(fullPath, "SKILL.md");
				try {
					await stat(skillPath);
					files.push(skillPath);
				} catch {
					// No SKILL.md here — recurse deeper
					const nested = await discoverSkillFiles(fullPath);
					files.push(...nested);
				}
			} else if (entry === "SKILL.md") {
				files.push(fullPath);
			}
		} catch {
			// skip inaccessible entries
		}
	}

	return files.sort();
}
