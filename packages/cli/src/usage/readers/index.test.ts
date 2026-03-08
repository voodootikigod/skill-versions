import { describe, expect, it, vi } from "vitest";

vi.mock("./jsonl.js", () => ({
	JSONLReader: class {
		read = vi.fn().mockResolvedValue([]);
		close = vi.fn();
	},
}));

vi.mock("./sqlite.js", () => ({
	SQLiteReader: class {
		read = vi.fn().mockResolvedValue([]);
		close = vi.fn();
	},
}));

import { createReader } from "./index.js";

describe("createReader", () => {
	it("creates JSONLReader for file:// URI", async () => {
		const reader = await createReader("file://./events.jsonl");
		expect(reader).toBeDefined();
		expect(reader.read).toBeDefined();
	});

	it("creates SQLiteReader for sqlite:// URI", async () => {
		const reader = await createReader("sqlite:///tmp/telemetry.db");
		expect(reader).toBeDefined();
		expect(reader.read).toBeDefined();
	});

	it("throws for unsupported URI scheme", async () => {
		await expect(createReader("ftp://server/events")).rejects.toThrow(
			"Unsupported telemetry store URI scheme",
		);
	});
});
