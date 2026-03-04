import type { AuditChecker, AuditFinding, CheckContext } from "../types.js";

const REQUIRED_FIELDS = ["name", "description", "product-version"] as const;
const RECOMMENDED_FIELDS = ["version", "author"] as const;

export const metadataChecker: AuditChecker = {
	name: "metadata-completeness",
	// biome-ignore lint/suspicious/useAwait: interface contract requires async
	async check(context: CheckContext): Promise<AuditFinding[]> {
		const findings: AuditFinding[] = [];
		const fm = context.file.frontmatter;

		for (const field of REQUIRED_FIELDS) {
			if (!fm[field] || (typeof fm[field] === "string" && fm[field].trim() === "")) {
				findings.push({
					file: context.file.path,
					line: 1,
					severity: "medium",
					category: "metadata-incomplete",
					message: `Missing required frontmatter field: ${field}`,
					evidence: `frontmatter.${field} is ${fm[field] === undefined ? "missing" : "empty"}`,
				});
			}
		}

		for (const field of RECOMMENDED_FIELDS) {
			if (!fm[field]) {
				findings.push({
					file: context.file.path,
					line: 1,
					severity: "low",
					category: "metadata-incomplete",
					message: `Missing recommended frontmatter field: ${field}`,
					evidence: `frontmatter.${field} is missing`,
				});
			}
		}

		return findings;
	},
};
