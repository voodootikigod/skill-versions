import type { ExtractedPackage } from "../types.js";

const PIP_VERSION_SPLIT_RE = /[=<>!~]/;

// npm/pnpm/yarn/bun package name: @scope/name or name, followed by optional @version
const NPM_PKG = /(?:@[\w.-]+\/)?[\w.-]+/;

// Patterns for npm-ecosystem installs
const NPM_INSTALL_RE = new RegExp(
	`(?:npm\\s+install|npm\\s+i|npx|pnpm\\s+add|pnpm\\s+dlx|yarn\\s+add|bunx|bun\\s+add)\\s+(?:(?:-[\\w-]+\\s+)*)(${NPM_PKG.source}(?:@\\S*)?)`,
	"g"
);

// pip install patterns
const PIP_RE = new RegExp(/(?:pip|pip3)\s+install\s+(?:(?:-[\w-]+\s+)*)(\S+)/.source, "g");

// cargo add/install patterns
const CARGO_RE = new RegExp(/cargo\s+(?:add|install)\s+(?:(?:-[\w-]+\s+)*)([\w.-]+)/.source, "g");

function stripVersion(name: string): string {
	// Remove @version suffix (e.g., "express@4" -> "express", "@org/pkg@1.0" -> "@org/pkg")
	const atIndex = name.startsWith("@") ? name.indexOf("@", 1) : name.indexOf("@");
	if (atIndex > 0) {
		return name.slice(0, atIndex);
	}
	return name;
}

function isFlag(token: string): boolean {
	return token.startsWith("-");
}

export function extractPackages(content: string): ExtractedPackage[] {
	const results: ExtractedPackage[] = [];
	const lines = content.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNumber = i + 1;

		// npm ecosystem
		for (const match of line.matchAll(NPM_INSTALL_RE)) {
			const raw = match[1];
			if (raw && !isFlag(raw)) {
				results.push({
					name: stripVersion(raw),
					ecosystem: "npm",
					line: lineNumber,
					source: match[0],
				});
			}
		}

		// pip
		for (const match of line.matchAll(PIP_RE)) {
			const raw = match[1];
			if (raw && !isFlag(raw)) {
				// pip uses == for version pinning
				const name = raw.split(PIP_VERSION_SPLIT_RE)[0];
				results.push({
					name,
					ecosystem: "pypi",
					line: lineNumber,
					source: match[0],
				});
			}
		}

		// cargo
		for (const match of line.matchAll(CARGO_RE)) {
			const raw = match[1];
			if (raw && !isFlag(raw)) {
				results.push({
					name: raw,
					ecosystem: "crates",
					line: lineNumber,
					source: match[0],
				});
			}
		}
	}

	return results;
}
