import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockProvider {
	available: () => Promise<boolean>;
	execute: () => void;
	isFallback: boolean;
	name: string;
}

// Mock all provider modules before imports
vi.mock("./providers/apple.js", () => ({
	AppleContainerProvider: vi.fn().mockImplementation(function (this: MockProvider) {
		this.name = "apple-container";
		this.isFallback = false;
		this.available = vi.fn().mockResolvedValue(false);
		this.execute = vi.fn();
	}),
}));
vi.mock("./providers/oci.js", () => ({
	OCIProvider: vi.fn().mockImplementation(function (this: MockProvider, runtime: { name: string }) {
		this.name = runtime.name;
		this.isFallback = false;
		this.available = vi.fn().mockResolvedValue(true);
		this.execute = vi.fn();
	}),
	detectOCIRuntime: vi.fn().mockResolvedValue(null),
}));
vi.mock("./providers/vercel.js", () => ({
	VercelSandboxProvider: vi.fn().mockImplementation(function (this: MockProvider) {
		this.name = "vercel-sandbox";
		this.isFallback = false;
		this.available = vi.fn().mockResolvedValue(false);
		this.execute = vi.fn();
	}),
}));
vi.mock("./providers/local.js", () => ({
	LocalProvider: vi.fn().mockImplementation(function (this: MockProvider, isFallback = false) {
		this.name = "local";
		this.isFallback = isFallback;
		this.available = vi.fn().mockResolvedValue(true);
		this.execute = vi.fn();
	}),
}));

import { selectProvider } from "./detect.js";
import { AppleContainerProvider } from "./providers/apple.js";
import { LocalProvider } from "./providers/local.js";
import { detectOCIRuntime } from "./providers/oci.js";
import { VercelSandboxProvider } from "./providers/vercel.js";

function resetMockDefaults() {
	vi.mocked(AppleContainerProvider).mockImplementation(function (this: MockProvider) {
		this.name = "apple-container";
		this.isFallback = false;
		this.available = vi.fn().mockResolvedValue(false);
		this.execute = vi.fn();
	});
	vi.mocked(VercelSandboxProvider).mockImplementation(function (this: MockProvider) {
		this.name = "vercel-sandbox";
		this.isFallback = false;
		this.available = vi.fn().mockResolvedValue(false);
		this.execute = vi.fn();
	});
	vi.mocked(LocalProvider).mockImplementation(function (this: MockProvider, isFallback = false) {
		this.name = "local";
		this.isFallback = isFallback;
		this.available = vi.fn().mockResolvedValue(true);
		this.execute = vi.fn();
	});
	vi.mocked(detectOCIRuntime).mockResolvedValue(null);
}

beforeEach(() => {
	vi.clearAllMocks();
	resetMockDefaults();
});

describe("selectProvider", () => {
	it("returns LocalProvider when choice is 'local'", async () => {
		const provider = await selectProvider("local");
		expect(provider.name).toBe("local");
		expect(provider.isFallback).toBe(false);
	});

	it("throws on invalid choice", async () => {
		await expect(selectProvider("invalid" as never)).rejects.toThrow(
			'Invalid --isolation value: "invalid"'
		);
	});

	describe("explicit provider selection", () => {
		it("returns AppleContainerProvider when available", async () => {
			vi.mocked(AppleContainerProvider).mockImplementation(function (this: MockProvider) {
				this.name = "apple-container";
				this.isFallback = false;
				this.available = vi.fn().mockResolvedValue(true);
				this.execute = vi.fn();
			});

			const provider = await selectProvider("apple-container");
			expect(provider.name).toBe("apple-container");
		});

		it("throws when AppleContainerProvider unavailable", async () => {
			await expect(selectProvider("apple-container")).rejects.toThrow(
				"Apple Containers (containerctl) not available"
			);
		});

		it("returns VercelSandboxProvider when available", async () => {
			vi.mocked(VercelSandboxProvider).mockImplementation(function (this: MockProvider) {
				this.name = "vercel-sandbox";
				this.isFallback = false;
				this.available = vi.fn().mockResolvedValue(true);
				this.execute = vi.fn();
			});

			const provider = await selectProvider("vercel-sandbox");
			expect(provider.name).toBe("vercel-sandbox");
		});

		it("throws when VercelSandboxProvider unavailable", async () => {
			await expect(selectProvider("vercel-sandbox")).rejects.toThrow(
				"Vercel Sandbox not available"
			);
		});
	});

	describe("explicit OCI runtime selection", () => {
		it("returns OCIProvider for a specific runtime", async () => {
			const runtime = { name: "podman" as const, cmd: "podman" };
			vi.mocked(detectOCIRuntime).mockResolvedValue(runtime);

			const provider = await selectProvider("podman");
			expect(detectOCIRuntime).toHaveBeenCalledWith("podman");
			expect(provider.name).toBe("podman");
		});

		it("throws when specific OCI runtime unavailable", async () => {
			vi.mocked(detectOCIRuntime).mockResolvedValue(null);

			await expect(selectProvider("docker")).rejects.toThrow('OCI runtime "docker" not available');
		});
	});

	describe("oci auto-detection", () => {
		it("returns the first detected OCI runtime", async () => {
			const runtime = { name: "orbstack" as const, cmd: "docker", detect: "orbctl" };
			vi.mocked(detectOCIRuntime).mockResolvedValue(runtime);

			const provider = await selectProvider("oci");
			expect(detectOCIRuntime).toHaveBeenCalledWith();
			expect(provider.name).toBe("orbstack");
		});

		it("throws when no OCI runtime available", async () => {
			vi.mocked(detectOCIRuntime).mockResolvedValue(null);

			await expect(selectProvider("oci")).rejects.toThrow("No OCI container runtime found");
		});
	});

	describe("auto waterfall", () => {
		it("prefers Apple Containers first", async () => {
			vi.mocked(AppleContainerProvider).mockImplementation(function (this: MockProvider) {
				this.name = "apple-container";
				this.isFallback = false;
				this.available = vi.fn().mockResolvedValue(true);
				this.execute = vi.fn();
			});

			const provider = await selectProvider("auto");
			expect(provider.name).toBe("apple-container");
			expect(provider.isFallback).toBe(false);
		});

		it("falls back to OCI when Apple unavailable", async () => {
			const runtime = { name: "docker" as const, cmd: "docker" };
			vi.mocked(detectOCIRuntime).mockResolvedValue(runtime);

			const provider = await selectProvider("auto");
			expect(provider.name).toBe("docker");
		});

		it("falls back to Vercel when Apple and OCI unavailable", async () => {
			vi.mocked(VercelSandboxProvider).mockImplementation(function (this: MockProvider) {
				this.name = "vercel-sandbox";
				this.isFallback = false;
				this.available = vi.fn().mockResolvedValue(true);
				this.execute = vi.fn();
			});

			const provider = await selectProvider("auto");
			expect(provider.name).toBe("vercel-sandbox");
		});

		it("falls back to local with isFallback=true when nothing else available", async () => {
			const provider = await selectProvider("auto");
			expect(provider.name).toBe("local");
			expect(provider.isFallback).toBe(true);
		});
	});
});
