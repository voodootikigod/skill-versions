import type { AuditFinding, AuditReport, AuditSeverity } from "../types.js";

interface SarifLevel {
	level: "error" | "warning" | "note";
}

function toSarifLevel(severity: AuditSeverity): SarifLevel["level"] {
	switch (severity) {
		case "critical":
		case "high":
			return "error";
		case "medium":
			return "warning";
		case "low":
			return "note";
		default:
			return "note";
	}
}

function toRuleId(finding: AuditFinding): string {
	return `skills-check/${finding.category}`;
}

function buildRules(findings: AuditFinding[]): object[] {
	const seen = new Set<string>();
	const rules: object[] = [];

	for (const f of findings) {
		const ruleId = toRuleId(f);
		if (!seen.has(ruleId)) {
			seen.add(ruleId);
			rules.push({
				id: ruleId,
				shortDescription: { text: f.category.replace(/-/g, " ") },
				defaultConfiguration: { level: toSarifLevel(f.severity) },
			});
		}
	}

	return rules;
}

function buildResults(findings: AuditFinding[]): object[] {
	return findings.map((f) => ({
		ruleId: toRuleId(f),
		level: toSarifLevel(f.severity),
		message: { text: f.message },
		locations: [
			{
				physicalLocation: {
					artifactLocation: { uri: f.file },
					region: { startLine: f.line },
				},
			},
		],
		properties: {
			severity: f.severity,
			evidence: f.evidence,
		},
	}));
}

export function formatSarif(report: AuditReport): string {
	const runs: object[] = [
		{
			tool: {
				driver: {
					name: "skills-check",
					informationUri: "https://skillscheck.ai",
					rules: buildRules(report.findings),
				},
			},
			results: buildResults(report.findings),
			invocations: [
				{
					executionSuccessful: true,
					endTimeUtc: report.generatedAt,
				},
			],
		},
	];

	// Add additional runs for registry auditors
	if (report.registryAudits && report.registryAudits.length > 0) {
		const findingsByAuditor = new Map<string, AuditFinding[]>();

		for (const finding of report.findings) {
			if (finding.category === "registry-audit") {
				const auditor = finding.message.split(":")[0];
				const existing = findingsByAuditor.get(auditor) ?? [];
				existing.push(finding);
				findingsByAuditor.set(auditor, existing);
			}
		}

		for (const [auditor, findings] of findingsByAuditor) {
			runs.push({
				tool: {
					driver: {
						name: `skills.sh/${auditor}`,
						informationUri: "https://skills.sh",
						rules: buildRules(findings),
					},
				},
				results: buildResults(findings),
				invocations: [
					{
						executionSuccessful: true,
						endTimeUtc: report.generatedAt,
					},
				],
			});
		}
	}

	const sarif = {
		$schema: "https://json.schemastore.org/sarif-2.1.0.json",
		version: "2.1.0",
		runs,
	};

	return JSON.stringify(sarif, null, 2);
}
