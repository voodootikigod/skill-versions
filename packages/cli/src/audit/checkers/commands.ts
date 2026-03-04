import type { AuditChecker, AuditFinding, CheckContext } from "../types.js";

interface CommandPattern {
	message: string;
	regex: RegExp;
	severity: "critical" | "medium";
}

const DESTRUCTIVE_PATTERNS: CommandPattern[] = [
	{
		regex: /\brm\s+(?:.*\s)?-\w*r\w*f/,
		message: "Destructive command: rm with recursive force",
		severity: "medium",
	},
	{
		regex: /\brm\s+-rf\s+[/~]/,
		message: "Destructive command: rm -rf targeting root or home",
		severity: "critical",
	},
	{
		regex: /\bchmod\s+777\b/,
		message: "Insecure permissions: chmod 777",
		severity: "medium",
	},
	{
		regex: /\bchmod\s+666\b/,
		message: "Insecure permissions: chmod 666",
		severity: "medium",
	},
	{
		regex: /\bmkfs\b/,
		message: "Destructive command: filesystem format",
		severity: "critical",
	},
	{
		regex: /\bdd\s+.*of=\/dev\//,
		message: "Destructive command: dd writing to device",
		severity: "critical",
	},
];

const PIPE_TO_SHELL_PATTERNS: CommandPattern[] = [
	{
		regex: /\bcurl\s+.*\|\s*(?:bash|sh|zsh)\b/,
		message: "Pipe-to-shell: curl output piped to shell",
		severity: "critical",
	},
	{
		regex: /\bwget\s+.*\|\s*(?:bash|sh|zsh)\b/,
		message: "Pipe-to-shell: wget output piped to shell",
		severity: "critical",
	},
	{
		regex: /\bcurl\s+.*\|\s*sudo\s+(?:bash|sh|zsh)\b/,
		message: "Pipe-to-shell with sudo: elevated privilege execution",
		severity: "critical",
	},
];

const SENSITIVE_ACCESS_PATTERNS: CommandPattern[] = [
	{
		regex: /~\/\.ssh\b|\/\.ssh\b/,
		message: "Sensitive path access: SSH directory",
		severity: "medium",
	},
	{
		regex: /~\/\.aws\b|\/\.aws\b/,
		message: "Sensitive path access: AWS credentials directory",
		severity: "medium",
	},
	{
		regex: /~\/\.netrc\b/,
		message: "Sensitive path access: .netrc credentials file",
		severity: "medium",
	},
	{
		regex: /~\/\.npmrc\b/,
		message: "Sensitive path access: .npmrc (may contain auth tokens)",
		severity: "medium",
	},
	{
		regex: /~\/\.pgpass\b/,
		message: "Sensitive path access: PostgreSQL password file",
		severity: "medium",
	},
	{
		regex: /\bcat\s+.*\.env\b/,
		message: "Sensitive path access: reading .env file",
		severity: "medium",
	},
	{
		regex: /\/etc\/(?:passwd|shadow)\b/,
		message: "Sensitive path access: system credentials file",
		severity: "medium",
	},
];

const DOWNLOAD_EXECUTE_PATTERNS: CommandPattern[] = [
	{
		regex: /\bcurl\b.*&&\s*(?:chmod\s.*\+x|bash|sh|\.\/)/,
		message: "Download-and-execute: curl followed by execution",
		severity: "medium",
	},
	{
		regex: /\bwget\b.*&&\s*(?:chmod\s.*\+x|bash|sh|\.\/)/,
		message: "Download-and-execute: wget followed by execution",
		severity: "medium",
	},
];

const ALL_COMMAND_PATTERNS = [
	...DESTRUCTIVE_PATTERNS,
	...PIPE_TO_SHELL_PATTERNS,
	...SENSITIVE_ACCESS_PATTERNS,
	...DOWNLOAD_EXECUTE_PATTERNS,
];

export const commandsChecker: AuditChecker = {
	name: "dangerous-command",
	// biome-ignore lint/suspicious/useAwait: interface contract requires async
	async check(context: CheckContext): Promise<AuditFinding[]> {
		const findings: AuditFinding[] = [];

		for (const extracted of context.commands) {
			for (const pattern of ALL_COMMAND_PATTERNS) {
				if (pattern.regex.test(extracted.command)) {
					findings.push({
						file: context.file.path,
						line: extracted.line,
						severity: pattern.severity,
						category: "dangerous-command",
						message: pattern.message,
						evidence: extracted.command.slice(0, 120),
					});
				}
			}
		}

		return findings;
	},
};
