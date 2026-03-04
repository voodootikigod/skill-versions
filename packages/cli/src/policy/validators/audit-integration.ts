import type { AuditSeverity } from "../../audit/types.js";
import type { PolicyFinding, SkillPolicy } from "../types.js";

const SEVERITY_ORDER: Record<AuditSeverity, number> = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3,
};

function meetsThreshold(severity: AuditSeverity, threshold: AuditSeverity): boolean {
	return SEVERITY_ORDER[severity] <= SEVERITY_ORDER[threshold];
}

/**
 * Run the audit command and convert findings above the severity threshold
 * into policy violations. This provides cross-command integration:
 * a single `policy check` command can enforce both organizational rules
 * AND security audit findings.
 */
export async function checkAuditClean(
	paths: string[],
	policy: SkillPolicy
): Promise<PolicyFinding[]> {
	if (!policy.audit?.require_clean) {
		return [];
	}

	const threshold = policy.audit.min_severity_to_block ?? "high";

	// Dynamic import to avoid circular dependencies and allow graceful degradation
	let runAudit: typeof import("../../audit/index.js").runAudit;
	try {
		const auditModule = await import("../../audit/index.js");
		runAudit = auditModule.runAudit;
	} catch {
		return [
			{
				file: "<audit>",
				severity: "warning",
				rule: "audit.require_clean",
				message: "Could not load audit module; skipping audit integration",
			},
		];
	}

	try {
		const report = await runAudit(paths, {});
		const findings: PolicyFinding[] = [];

		for (const f of report.findings) {
			if (meetsThreshold(f.severity, threshold)) {
				findings.push({
					file: f.file,
					severity: "violation",
					rule: "audit.require_clean",
					message: `Audit finding: ${f.message}`,
					detail: `Severity: ${f.severity}, Category: ${f.category}`,
					line: f.line,
				});
			}
		}

		return findings;
	} catch {
		return [
			{
				file: "<audit>",
				severity: "warning",
				rule: "audit.require_clean",
				message: "Audit failed to run; skipping audit integration",
			},
		];
	}
}
