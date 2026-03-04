import { execFile } from "node:child_process";
import { promisify } from "node:util";
import matter from "gray-matter";
import type { SkillFile } from "../skill-io.js";
import type { LintFinding } from "./types.js";

const execFileAsync = promisify(execFile);

/**
 * Attempt to resolve a value for a fixable field from the local environment.
 */
async function resolveGitValue(command: string, args: string[]): Promise<string | null> {
	try {
		const { stdout } = await execFileAsync(command, args, { timeout: 5000 });
		const value = stdout.trim();
		return value.length > 0 ? value : null;
	} catch {
		return null;
	}
}

/**
 * Auto-fix missing fixable frontmatter fields.
 *
 * Fixable fields and their resolution strategies:
 * - author: from `git config user.name`
 * - repository: from `git remote get-url origin`
 * - license: defaults to "MIT"
 *
 * Returns null if no findings are fixable or no fixes could be applied.
 * Returns the updated file content and list of fields that were fixed.
 */
export async function autofix(
	file: SkillFile,
	findings: LintFinding[]
): Promise<{ content: string; fixed: string[] } | null> {
	const fixableFindings = findings.filter((f) => f.fixable && f.file === file.path);
	if (fixableFindings.length === 0) {
		return null;
	}

	const fixedFields: string[] = [];
	const updatedFrontmatter = { ...file.frontmatter };

	for (const finding of fixableFindings) {
		switch (finding.field) {
			case "author": {
				const name = await resolveGitValue("git", ["config", "user.name"]);
				if (name) {
					updatedFrontmatter.author = name;
					fixedFields.push("author");
				}
				break;
			}
			case "repository": {
				const url = await resolveGitValue("git", ["remote", "get-url", "origin"]);
				if (url) {
					updatedFrontmatter.repository = url;
					fixedFields.push("repository");
				}
				break;
			}
			case "license": {
				updatedFrontmatter.license = "MIT";
				fixedFields.push("license");
				break;
			}
			default:
				break;
		}
	}

	if (fixedFields.length === 0) {
		return null;
	}

	// Reconstruct the file with updated frontmatter
	const newContent = matter.stringify(file.content, updatedFrontmatter);
	return { content: newContent, fixed: fixedFields };
}
