import type { SkillTelemetryEvent } from "@skills-check/schema";

export type { SkillTelemetryEvent };

export interface TelemetryReaderOptions {
	since?: Date;
	until?: Date;
}

export interface TelemetryReader {
	read(options?: TelemetryReaderOptions): Promise<SkillTelemetryEvent[]>;
	close(): Promise<void>;
}
