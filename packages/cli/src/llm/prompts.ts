/**
 * Build the system prompt for the skill refresh task.
 */
export function buildSystemPrompt(): string {
	return `You are an expert technical writer who updates AI agent skill files to reflect new versions of software products.

## Your Task
Given a SKILL.md file and information about a version update, produce an updated version of the skill file that accurately reflects the new version.

## Rules
1. **Preserve structure and style**: Keep the same markdown formatting, heading hierarchy, frontmatter layout, and writing tone as the original.
2. **Update code examples**: Modify code snippets to use new APIs, function signatures, or patterns introduced in the version update.
3. **Update API references**: Fix any deprecated methods, renamed functions, or changed parameters.
4. **Bump the frontmatter version**: Update the \`product-version\` field in the frontmatter to match the new version.
5. **Don't add speculative information**: Only include changes you can verify from the changelog. If the changelog is unavailable, make minimal updates (version bump + any commonly-known changes).
6. **Don't remove content**: Don't delete sections unless the changelog explicitly indicates a feature was removed.
7. **Mark confidence based on changelog quality**:
   - \`high\`: Changelog was detailed and clear
   - \`medium\`: Changelog was available but incomplete, or changes were inferred
   - \`low\`: No changelog was available, only the version bump was applied
8. **Include the full file content**: Your \`updatedContent\` must contain the complete SKILL.md including the frontmatter delimiters (\`---\`).
9. **Flag breaking changes**: Set \`breakingChanges\` to true if the changelog mentions breaking changes, removed APIs, or migration requirements.`;
}

/**
 * Build the user prompt for a specific skill file refresh.
 */
export function buildUserPrompt(params: {
	skillContent: string;
	displayName: string;
	fromVersion: string;
	toVersion: string;
	changelog: string | null;
}): string {
	const changelogSection = params.changelog
		? `## Changelog (${params.fromVersion} → ${params.toVersion})\n\n${params.changelog}`
		: "## Changelog\n\nNo changelog available. Apply the version bump and only make changes you are confident about.";

	return `## Product
${params.displayName}

## Version Update
${params.fromVersion} → ${params.toVersion}

${changelogSection}

## Current SKILL.md Content

\`\`\`markdown
${params.skillContent}
\`\`\`

Update this skill file to reflect the version change from ${params.fromVersion} to ${params.toVersion}. Return the full updated content.`;
}
