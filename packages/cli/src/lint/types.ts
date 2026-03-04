export interface LintFinding {
	field: string;
	file: string;
	fixable: boolean;
	level: "error" | "warning" | "info";
	message: string;
}

export interface LintReport {
	errors: number;
	files: number;
	findings: LintFinding[];
	fixed: number;
	generatedAt: string;
	infos: number;
	warnings: number;
}

export interface LintOptions {
	ci?: boolean;
	failOn?: "error" | "warning";
	fix?: boolean;
	format?: "terminal" | "json";
	output?: string;
}
