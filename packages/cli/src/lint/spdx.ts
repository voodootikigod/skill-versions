/**
 * SPDX license identifier validation.
 *
 * Uses a hardcoded list of common SPDX identifiers to avoid adding a dependency.
 * Supports simple identifiers and compound expressions (OR/AND).
 */

const SPDX_IDENTIFIERS = new Set([
	"0BSD",
	"AAL",
	"AFL-3.0",
	"AGPL-1.0-only",
	"AGPL-1.0-or-later",
	"AGPL-3.0-only",
	"AGPL-3.0-or-later",
	"Apache-1.1",
	"Apache-2.0",
	"APSL-2.0",
	"Artistic-2.0",
	"BlueOak-1.0.0",
	"BSD-1-Clause",
	"BSD-2-Clause",
	"BSD-2-Clause-Patent",
	"BSD-3-Clause",
	"BSD-3-Clause-LBNL",
	"BSL-1.0",
	"CAL-1.0",
	"CAL-1.0-Combined-Work-Exception",
	"CC-BY-1.0",
	"CC-BY-2.0",
	"CC-BY-2.5",
	"CC-BY-3.0",
	"CC-BY-4.0",
	"CC-BY-NC-1.0",
	"CC-BY-NC-2.0",
	"CC-BY-NC-2.5",
	"CC-BY-NC-3.0",
	"CC-BY-NC-4.0",
	"CC-BY-NC-ND-1.0",
	"CC-BY-NC-ND-2.0",
	"CC-BY-NC-ND-2.5",
	"CC-BY-NC-ND-3.0",
	"CC-BY-NC-ND-4.0",
	"CC-BY-NC-SA-1.0",
	"CC-BY-NC-SA-2.0",
	"CC-BY-NC-SA-2.5",
	"CC-BY-NC-SA-3.0",
	"CC-BY-NC-SA-4.0",
	"CC-BY-ND-1.0",
	"CC-BY-ND-2.0",
	"CC-BY-ND-2.5",
	"CC-BY-ND-3.0",
	"CC-BY-ND-4.0",
	"CC-BY-SA-1.0",
	"CC-BY-SA-2.0",
	"CC-BY-SA-2.5",
	"CC-BY-SA-3.0",
	"CC-BY-SA-4.0",
	"CC0-1.0",
	"CPAL-1.0",
	"ECL-2.0",
	"EFL-2.0",
	"EPL-1.0",
	"EPL-2.0",
	"EUDatagrid",
	"EUPL-1.1",
	"EUPL-1.2",
	"FSFAP",
	"FSFUL",
	"FSFULLR",
	"GPL-2.0-only",
	"GPL-2.0-or-later",
	"GPL-3.0-only",
	"GPL-3.0-or-later",
	"ISC",
	"LGPL-2.0-only",
	"LGPL-2.0-or-later",
	"LGPL-2.1-only",
	"LGPL-2.1-or-later",
	"LGPL-3.0-only",
	"LGPL-3.0-or-later",
	"LiLiQ-P-1.1",
	"LiLiQ-R-1.1",
	"LiLiQ-Rplus-1.1",
	"MIT",
	"MIT-0",
	"MPL-2.0",
	"MPL-2.0-no-copyleft-exception",
	"MS-PL",
	"MS-RL",
	"MulanPSL-2.0",
	"NCSA",
	"Nokia",
	"OFL-1.1",
	"OSL-3.0",
	"PostgreSQL",
	"QPL-1.0",
	"RPL-1.5",
	"RPSL-1.0",
	"RSCPL",
	"SimPL-2.0",
	"SISSL",
	"Sleepycat",
	"SPL-1.0",
	"UCL-1.0",
	"Unicode-DFS-2016",
	"Unlicense",
	"UPL-1.0",
	"VSL-1.0",
	"W3C",
	"Watcom-1.0",
	"Xnet",
	"Zlib",
	"ZPL-2.0",
]);

/**
 * Check if a string is a valid single SPDX identifier.
 */
function isValidIdentifier(id: string): boolean {
	return SPDX_IDENTIFIERS.has(id.trim());
}

/**
 * Check if a string is a valid SPDX license expression.
 *
 * Supports simple identifiers (e.g., "MIT") and compound expressions
 * using OR/AND operators (e.g., "MIT OR Apache-2.0").
 * Also supports parenthesized sub-expressions.
 */
export function isValidSpdx(license: string): boolean {
	if (!license || typeof license !== "string") {
		return false;
	}

	const trimmed = license.trim();
	if (trimmed.length === 0) {
		return false;
	}

	// Strip outer parentheses for recursive evaluation
	if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
		return isValidSpdx(trimmed.slice(1, -1));
	}

	// Split by OR first (lower precedence), then AND
	if (trimmed.includes(" OR ")) {
		const parts = trimmed.split(" OR ");
		return parts.every((part) => isValidSpdx(part.trim()));
	}

	if (trimmed.includes(" AND ")) {
		const parts = trimmed.split(" AND ");
		return parts.every((part) => isValidSpdx(part.trim()));
	}

	return isValidIdentifier(trimmed);
}
