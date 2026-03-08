import type { TelemetryReader } from "./types.js";

export type { TelemetryReader, TelemetryReaderOptions, SkillTelemetryEvent } from "./types.js";

/**
 * Create a telemetry reader from a store URI.
 *
 * Supported schemes:
 * - file://path/to/events.jsonl → JSONLReader
 * - sqlite:///path/to/telemetry.db → SQLiteReader
 */
export async function createReader(storeUri: string): Promise<TelemetryReader> {
	if (storeUri.startsWith("file://")) {
		const filePath = storeUri.replace("file://", "");
		const { JSONLReader } = await import("./jsonl.js");
		return new JSONLReader(filePath);
	}

	if (storeUri.startsWith("sqlite://")) {
		const dbPath = storeUri.replace("sqlite://", "");
		const { SQLiteReader } = await import("./sqlite.js");
		return new SQLiteReader(dbPath);
	}

	throw new Error(
		`Unsupported telemetry store URI scheme: "${storeUri}". ` +
			"Supported: file://path/to/events.jsonl, sqlite:///path/to/db",
	);
}
