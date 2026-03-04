import type { AuditFinding, AuditReport, AuditSeverity } from "../types.js";

function groupBySeverity(findings: AuditFinding[]): Map<AuditSeverity, AuditFinding[]> {
	const groups = new Map<AuditSeverity, AuditFinding[]>();
	for (const f of findings) {
		const existing = groups.get(f.severity) ?? [];
		existing.push(f);
		groups.set(f.severity, existing);
	}
	return groups;
}

export function formatMarkdown(report: AuditReport): string {
	const lines: string[] = [];
	const now = report.generatedAt.split("T")[0];

	lines.push("# Skillsafe Audit Report");
	lines.push("");
	lines.push(`Generated: ${now}`);
	lines.push("");

	// Summary table
	lines.push("## Summary");
	lines.push("");
	lines.push("| Severity | Count |");
	lines.push("|----------|-------|");
	lines.push(`| Critical | ${report.summary.critical} |`);
	lines.push(`| High | ${report.summary.high} |`);
	lines.push(`| Medium | ${report.summary.medium} |`);
	lines.push(`| Low | ${report.summary.low} |`);
	lines.push(`| **Total** | **${report.summary.total}** |`);
	lines.push("");
	lines.push(`Files scanned: ${report.files}`);
	lines.push("");

	if (report.findings.length === 0) {
		lines.push("No findings. All skill files look clean.");
		lines.push("");
		return lines.join("\n");
	}

	// Sections per severity
	const severityOrder: AuditSeverity[] = ["critical", "high", "medium", "low"];
	const grouped = groupBySeverity(report.findings);

	for (const severity of severityOrder) {
		const findings = grouped.get(severity);
		if (!findings || findings.length === 0) {
			continue;
		}

		lines.push(`## ${severity.charAt(0).toUpperCase() + severity.slice(1)} (${findings.length})`);
		lines.push("");
		lines.push("| File | Line | Category | Message |");
		lines.push("|------|------|----------|---------|");

		for (const f of findings) {
			const escapedMessage = f.message.replace(/\|/g, "\\|");
			lines.push(`| ${f.file} | ${f.line} | ${f.category} | ${escapedMessage} |`);
		}

		lines.push("");
	}

	// Registry Security Audits section
	if (report.registryAudits && report.registryAudits.length > 0) {
		lines.push("## Registry Security Audits");
		lines.push("");
		lines.push("| Skill | Snyk | Socket | Gen |");
		lines.push("|-------|------|--------|-----|");

		for (const ra of report.registryAudits) {
			const snyk = ra.entries.find((e) => e.auditor === "snyk");
			const socket = ra.entries.find((e) => e.auditor === "socket");
			const gen = ra.entries.find((e) => e.auditor === "gen");

			lines.push(
				`| ${ra.skillName} | ${snyk?.status ?? "—"} | ${socket?.status ?? "—"} | ${gen?.status ?? "—"} |`
			);
		}

		lines.push("");
	}

	return lines.join("\n");
}
