import type { AuditChecker, AuditFinding, CheckContext } from "../types.js";

interface Pattern {
	message: string;
	regex: RegExp;
}

const INJECTION_NOTE =
	"Fast local check. For comprehensive prompt injection analysis, see Snyk results via --include-registry-audits.";

const OVERRIDE_PATTERNS: Pattern[] = [
	{
		regex: /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i,
		message: "Override instruction detected: attempts to override prior instructions",
	},
	{
		regex: /disregard\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i,
		message: "Override instruction detected: disregard prior instructions",
	},
	{
		regex: /you\s+are\s+now\s+(?:a|an)\s+/i,
		message: "Role hijacking detected: attempts to redefine agent identity",
	},
	{
		regex:
			/forget\s+(?:all\s+)?(?:your\s+)?(?:previous\s+|prior\s+)?(?:instructions|rules|constraints)/i,
		message: "Override instruction detected: forget constraints",
	},
	{
		regex: /do\s+not\s+follow\s+(?:any|your)\s+(?:previous|prior|original)\s+/i,
		message: "Override instruction detected: do not follow prior instructions",
	},
];

const EXFILTRATION_PATTERNS: Pattern[] = [
	{
		regex: /(?:curl|wget|fetch)\s+.*(?:\$\{?\w+|`.*`)/i,
		message: "Potential data exfiltration: dynamic URL with variable interpolation",
	},
	{
		regex: /(?:send|post|upload|exfil)\s+.*(?:secret|key|token|password|credential)/i,
		message: "Potential data exfiltration: references sending sensitive data",
	},
	{
		regex: /send\s+the\s+contents?\s+of\b/i,
		message: "Potential data exfiltration: instruction to send file contents",
	},
	{
		regex:
			/(?:upload|post|transmit)\s+(?:to|the)\b.*(?:\.ssh|\.env|\.aws|credentials|private.key)/i,
		message: "Potential data exfiltration: instruction to upload sensitive files",
	},
];

const OBFUSCATION_PATTERNS: Pattern[] = [
	{
		regex: /(?:echo|printf)\s+.*\|\s*base64\s+(?:-d|--decode)/i,
		message: "Obfuscation detected: base64 decode in pipeline",
	},
	{
		regex: /\beval\s*\(\s*(?:atob|Buffer\.from)\b/i,
		message: "Obfuscation detected: eval with base64 decoding",
	},
	{
		regex: /[\u200B-\u200F\u2028-\u202F\uFEFF]/,
		message: "Obfuscation detected: zero-width or invisible Unicode characters",
	},
];

const ALL_PATTERNS = [...OVERRIDE_PATTERNS, ...EXFILTRATION_PATTERNS, ...OBFUSCATION_PATTERNS];

export const injectionChecker: AuditChecker = {
	name: "prompt-injection",
	// biome-ignore lint/suspicious/useAwait: interface contract requires async
	async check(context: CheckContext): Promise<AuditFinding[]> {
		const findings: AuditFinding[] = [];
		const lines = context.file.raw.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lineNumber = i + 1;

			for (const pattern of ALL_PATTERNS) {
				if (pattern.regex.test(line)) {
					findings.push({
						file: context.file.path,
						line: lineNumber,
						severity: "medium",
						category: "prompt-injection",
						message: pattern.message,
						evidence: line.trim().slice(0, 120),
						note: INJECTION_NOTE,
					});
				}
			}
		}

		return findings;
	},
};
