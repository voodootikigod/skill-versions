import type { AuditChecker, AuditFinding, CheckContext } from "../types.js";

/**
 * Known hallucinated package names from the Aikido Security research
 * and other documented cases of LLM-generated phantom packages.
 *
 * Sources:
 * - Aikido Security: 237 repos with hallucinated npm packages
 * - Socket.dev research on LLM package hallucinations
 * - Community-reported cases
 */
const KNOWN_HALLUCINATED_NPM = new Set([
	"react-codeshift",
	"react-code-transform",
	"ai-token-counter",
	"nextjs-middleware-auth",
	"vue-reactive-store",
	"express-rate-limiter-pro",
	"mongodb-query-builder-pro",
	"graphql-schema-validator-pro",
	"typescript-config-helper",
	"node-crypto-utils",
	"python-bridge-js",
	"aws-lambda-helper-utils",
	"serverless-deploy-helper",
	"docker-compose-validator",
	"kubernetes-config-helper",
	"redis-cache-manager-pro",
]);

const KNOWN_HALLUCINATED_PYPI = new Set([
	"huggingface-cli",
	"torch-utils-pro",
	"flask-api-builder",
	"django-rest-helper",
	"numpy-extra-utils",
	"tensorflow-model-helper",
	"pandas-data-cleaner",
]);

const KNOWN_HALLUCINATED_CRATES = new Set([
	"rust-web-framework",
	"async-http-client-pro",
	"serde-json-helper",
]);

function getAdvisoryDb(ecosystem: "npm" | "pypi" | "crates"): Set<string> {
	switch (ecosystem) {
		case "npm":
			return KNOWN_HALLUCINATED_NPM;
		case "pypi":
			return KNOWN_HALLUCINATED_PYPI;
		case "crates":
			return KNOWN_HALLUCINATED_CRATES;
		default:
			return new Set<string>();
	}
}

export const advisoryChecker: AuditChecker = {
	name: "advisory-match",
	// biome-ignore lint/suspicious/useAwait: interface contract requires async
	async check(context: CheckContext): Promise<AuditFinding[]> {
		const findings: AuditFinding[] = [];

		for (const pkg of context.packages) {
			const db = getAdvisoryDb(pkg.ecosystem);
			if (db.has(pkg.name)) {
				findings.push({
					file: context.file.path,
					line: pkg.line,
					severity: "critical",
					category: "advisory-match",
					message: `Package "${pkg.name}" is a known hallucinated package name (${pkg.ecosystem} advisory)`,
					evidence: pkg.source,
				});
			}
		}

		return findings;
	},
};
