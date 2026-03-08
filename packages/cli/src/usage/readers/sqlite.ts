import type { SkillTelemetryEvent, TelemetryReader, TelemetryReaderOptions } from "./types.js";

/**
 * Read telemetry events from a SQLite database.
 * Uses Node 22 built-in node:sqlite module.
 */
export class SQLiteReader implements TelemetryReader {
	private db: unknown = null;

	constructor(private dbPath: string) {}

	private async getDb(): Promise<{ prepare: (sql: string) => { all: (...args: unknown[]) => unknown[] } }> {
		if (this.db) return this.db as never;
		try {
			const { DatabaseSync } = await import("node:sqlite");
			this.db = new DatabaseSync(this.dbPath, { readOnly: true });
			return this.db as never;
		} catch {
			throw new Error(
				"SQLite reader requires Node.js 22+ with built-in sqlite module. " +
					"Use a JSONL telemetry store instead, or upgrade Node.js.",
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
		const rows = stmt.all(...params) as Array<Record<string, unknown>>;

		return rows.map((row) => ({
			schema_version: 1 as const,
			timestamp: row.timestamp as string,
			detection: row.detection as SkillTelemetryEvent["detection"],
			confidence: row.confidence as number,
			skill: {
				name: row.skill_name as string,
				version: row.skill_version as string,
				source: (row.skill_source as string) || undefined,
			},
			request: {
				id: row.request_id as string,
				model: row.model as string,
				skill_tokens: row.skill_tokens as number,
				total_prompt_tokens: (row.total_prompt_tokens as number) || undefined,
			},
			org: row.org_user || row.org_team || row.org_project
				? {
						user: (row.org_user as string) || undefined,
						team: (row.org_team as string) || undefined,
						project: (row.org_project as string) || undefined,
					}
				: undefined,
		}));
	}

	async close(): Promise<void> {
		if (this.db) {
			(this.db as { close: () => void }).close();
			this.db = null;
		}
	}
}
