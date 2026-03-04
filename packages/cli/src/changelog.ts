import { coerce, compare, gt, lte, valid } from "semver";
import { fetchPackageMetadata } from "./npm.js";

const MAX_CHANGELOG_LENGTH = 8000;
const GITHUB_URL_RE = /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/;
const CHANGELOG_HEADING_RE = /^#{1,3}\s+.*?(\d+\.\d+\.\d+)/;

interface GitHubRelease {
	body: string;
	name: string;
	published_at: string;
	tag_name: string;
}

/**
 * Fetch changelog/release notes between two versions of a package.
 *
 * Waterfall strategy:
 * 1. Registry changelog URL (if provided) — fetch and return raw content
 * 2. npm metadata → derive GitHub owner/repo → GitHub Releases API
 * 3. GitHub raw CHANGELOG.md → extract relevant section
 * 4. Return null if all fail
 */
export async function fetchChangelog(
	packageName: string,
	fromVersion: string,
	toVersion: string,
	changelogUrl?: string
): Promise<string | null> {
	// Strategy 1: Direct changelog URL from registry
	if (changelogUrl) {
		const content = await fetchUrl(changelogUrl);
		if (content) {
			return truncate(content);
		}
	}

	// Strategy 2 & 3: Derive GitHub repo from npm metadata
	const repo = await resolveGitHubRepo(packageName);
	if (!repo) {
		return null;
	}

	// Strategy 2: GitHub Releases API
	const releases = await fetchGitHubReleases(repo.owner, repo.repo, fromVersion, toVersion);
	if (releases) {
		return truncate(releases);
	}

	// Strategy 3: Raw CHANGELOG.md
	const changelog = await fetchRawChangelog(repo.owner, repo.repo, fromVersion, toVersion);
	if (changelog) {
		return truncate(changelog);
	}

	return null;
}

/**
 * Resolve a GitHub owner/repo from npm package metadata.
 */
export async function resolveGitHubRepo(
	packageName: string
): Promise<{ owner: string; repo: string } | null> {
	try {
		const metadata = await fetchPackageMetadata(packageName);
		if (!metadata.repository?.url) {
			return null;
		}

		return parseGitHubUrl(metadata.repository.url);
	} catch {
		return null;
	}
}

/**
 * Parse a GitHub URL into owner/repo components.
 * Handles: git+https://github.com/owner/repo.git, https://github.com/owner/repo, etc.
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
	const match = url.match(GITHUB_URL_RE);
	if (!match) {
		return null;
	}
	return { owner: match[1], repo: match[2] };
}

/**
 * Fetch releases between two versions from GitHub Releases API.
 */
async function fetchGitHubReleases(
	owner: string,
	repo: string,
	fromVersion: string,
	toVersion: string
): Promise<string | null> {
	try {
		const headers: Record<string, string> = {
			Accept: "application/vnd.github+json",
		};

		const token = process.env.GITHUB_TOKEN;
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		const response = await fetch(
			`https://api.github.com/repos/${owner}/${repo}/releases?per_page=50`,
			{ headers }
		);

		if (!response.ok) {
			return null;
		}

		const releases = (await response.json()) as GitHubRelease[];
		const relevant = releases.filter((r) => {
			const version = valid(coerce(r.tag_name));
			if (!version) {
				return false;
			}
			return gt(version, fromVersion) && lte(version, toVersion);
		});

		if (relevant.length === 0) {
			return null;
		}

		return relevant
			.sort((a, b) => {
				const va = valid(coerce(a.tag_name)) ?? "0.0.0";
				const vb = valid(coerce(b.tag_name)) ?? "0.0.0";
				return compare(vb, va);
			})
			.map((r) => `## ${r.tag_name}\n\n${r.body}`)
			.join("\n\n---\n\n");
	} catch {
		return null;
	}
}

/**
 * Fetch and extract relevant section from a raw CHANGELOG.md on GitHub.
 */
async function fetchRawChangelog(
	owner: string,
	repo: string,
	fromVersion: string,
	toVersion: string
): Promise<string | null> {
	try {
		const headers: Record<string, string> = {};
		const token = process.env.GITHUB_TOKEN;
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		const response = await fetch(
			`https://raw.githubusercontent.com/${owner}/${repo}/main/CHANGELOG.md`,
			{ headers }
		);

		if (!response.ok) {
			return null;
		}

		const content = await response.text();
		return extractChangelogSection(content, fromVersion, toVersion);
	} catch {
		return null;
	}
}

/**
 * Extract the relevant section from a CHANGELOG.md between two versions.
 * Looks for markdown headings that contain version numbers.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: orchestrator function
export function extractChangelogSection(
	changelog: string,
	fromVersion: string,
	toVersion: string
): string | null {
	const lines = changelog.split("\n");
	const sections: string[] = [];
	let capturing = false;
	let currentSection: string[] = [];

	for (const line of lines) {
		const headingMatch = line.match(CHANGELOG_HEADING_RE);
		if (headingMatch) {
			// Save previous section if we were capturing
			if (capturing && currentSection.length > 0) {
				sections.push(currentSection.join("\n"));
			}

			const version = valid(coerce(headingMatch[1]));
			if (version) {
				if (gt(version, fromVersion) && lte(version, toVersion)) {
					capturing = true;
					currentSection = [line];
					continue;
				}
				if (lte(version, fromVersion)) {
					// Past our range, stop
					break;
				}
			}
			capturing = false;
			currentSection = [];
			continue;
		}

		if (capturing) {
			currentSection.push(line);
		}
	}

	// Don't forget the last section if still capturing
	if (capturing && currentSection.length > 0) {
		sections.push(currentSection.join("\n"));
	}

	return sections.length > 0 ? sections.join("\n\n") : null;
}

/**
 * Fetch URL content as text, returning null on failure.
 */
async function fetchUrl(url: string): Promise<string | null> {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			return null;
		}
		return await response.text();
	} catch {
		return null;
	}
}

/**
 * Truncate changelog to stay within context budgets.
 */
function truncate(content: string): string {
	if (content.length <= MAX_CHANGELOG_LENGTH) {
		return content;
	}
	return `${content.slice(0, MAX_CHANGELOG_LENGTH)}\n\n... (truncated)`;
}
