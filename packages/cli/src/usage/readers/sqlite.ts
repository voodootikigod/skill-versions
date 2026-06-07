import type { SkillTelemetryEvent, TelemetryReader, TelemetryReaderOptions } from "./types.js";

/**
 * Read telemetry events from a SQLite database.
 * Uses Node 22 built-in node:sqlite module.
 */
export class SQLiteReader implements TelemetryReader {
	private db: unknown = null;
	private readonly dbPath: string;

	constructor(dbPath: string) {
		this.dbPath = dbPath;
	}

	private async getDb(): Promise<{
		prepare: (sql: string) => { all: (...args: unknown[]) => unknown[] };
	}> {
		if (this.db) {
			return this.db as never;
		}
		try {
			const { DatabaseSync } = await import("node:sqlite");
			this.db = new DatabaseSync(this.dbPath, { readOnly: true });
			return this.db as never;
		} catch {
			throw new Error(
				"SQLite reader requires Node.js 22+ with built-in sqlite module. " +
					"Use a JSONL telemetry store instead, or upgrade Node.js."
			);
		}
	}

	async read(options?: TelemetryReaderOptions): Promise<SkillTelemetryEvent[]> {
		const db = await this.getDb();

		let sql = "SELECT * FROM skill_events WHERE 1=1";
		const params: unknown[] = [];

		if (options?.since) {
			sql += " AND timestamp >= ?";
			params.push(options.since.toISOString());
		}
		if (options?.until) {
			sql += " AND timestamp <= ?";
			params.push(options.until.toISOString());
		}

		sql += " ORDER BY timestamp DESC";

		const stmt = db.prepare(sql);
		const rows = stmt.all(...params) as Record<string, unknown>[];

		return rows.map((row) => ({
			schemaVersion: 1 as const,
			timestamp: row.timestamp as string,
			detection: row.detection as SkillTelemetryEvent["detection"],
			confidence: row.confidence as number,
			skillId: row.skill_id as string,
			version: row.skill_version as string,
			registry: (row.registry as string) || undefined,
			requestId: (row.request_id as string) || undefined,
			model: (row.model as string) || undefined,
			skillTokens: (row.skill_tokens as number) || undefined,
			totalPromptTokens: (row.total_prompt_tokens as number) || undefined,
			team: (row.team as string) || undefined,
			project: (row.project as string) || undefined,
			user: (row.user as string) || undefined,
		}));
	}

	// biome-ignore lint/suspicious/useAwait: interface contract requires async
	async close(): Promise<void> {
		if (this.db) {
			(this.db as { close: () => void }).close();
			this.db = null;
		}
	}
}
