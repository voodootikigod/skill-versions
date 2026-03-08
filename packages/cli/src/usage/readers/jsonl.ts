import { readFile } from "node:fs/promises";
import type { SkillTelemetryEvent, TelemetryReader, TelemetryReaderOptions } from "./types.js";

/**
 * Read telemetry events from a newline-delimited JSON file.
 */
export class JSONLReader implements TelemetryReader {
	constructor(private filePath: string) {}

	async read(options?: TelemetryReaderOptions): Promise<SkillTelemetryEvent[]> {
		const content = await readFile(this.filePath, "utf-8");
		const lines = content.split("\n").filter((line) => line.trim().length > 0);
		const events: SkillTelemetryEvent[] = [];

		for (const line of lines) {
			try {
				const event = JSON.parse(line) as SkillTelemetryEvent;
				if (event.schema_version !== 1) continue;
				if (!event.timestamp || !event.skill || !event.request) continue;

				// Date filtering
				if (options?.since || options?.until) {
					const ts = new Date(event.timestamp);
					if (options.since && ts < options.since) continue;
					if (options.until && ts > options.until) continue;
				}

				events.push(event);
			} catch {
				// Skip malformed lines
			}
		}

		return events;
	}

	async close(): Promise<void> {
		// No-op for file reader
	}
}
