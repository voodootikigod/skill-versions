import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
	execFile: vi.fn((_cmd: string, _args: string[], optsOrCb: unknown, maybeCb?: unknown) => {
		const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
		if (typeof cb === "function") {
			// Default: command succeeds
			(cb as (err: null, stdout: string, stderr: string) => void)(null, "", "");
		}
	}),
}));

import { execFile } from "node:child_process";
import { detectOCIRuntime, OCI_RUNTIMES, OCIProvider } from "./oci.js";

const mockedExecFile = vi.mocked(execFile);

beforeEach(() => {
	vi.clearAllMocks();
});

describe("OCI_RUNTIMES", () => {
	it("has orbstack and rancher before docker", () => {
		const names = OCI_RUNTIMES.map((r) => r.name);
		expect(names.indexOf("orbstack")).toBeLessThan(names.indexOf("docker"));
		expect(names.indexOf("rancher")).toBeLessThan(names.indexOf("docker"));
	});

	it("includes all expected runtimes", () => {
		const names = OCI_RUNTIMES.map((r) => r.name);
		expect(names).toContain("docker");
		expect(names).toContain("podman");
		expect(names).toContain("orbstack");
		expect(names).toContain("rancher");
		expect(names).toContain("nerdctl");
		expect(names).toContain("cri-o");
	});
});

describe("detectOCIRuntime", () => {
	it("returns null when no runtime available", async () => {
		// All commands fail
		mockedExecFile.mockImplementation((_cmd, _args, optsOrCb, maybeCb) => {
			const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
			if (typeof cb === "function") {
				(cb as (err: Error) => void)(new Error("not found"));
			}
			return undefined as never;
		});

		const result = await detectOCIRuntime();
		expect(result).toBeNull();
	});

	it("returns docker when docker info succeeds", async () => {
		mockedExecFile.mockImplementation((cmd, args, optsOrCb, maybeCb) => {
			const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
			if (typeof cb === "function") {
				const cmdStr = String(cmd);
				const argsArr = args as string[];

				// `which orbctl` and `which rdctl` fail (no OrbStack/Rancher)
				if (cmdStr === "which" && (argsArr[0] === "orbctl" || argsArr[0] === "rdctl")) {
					(cb as (err: Error) => void)(new Error("not found"));
					return undefined as never;
				}

				// `docker info` succeeds
				if (cmdStr === "docker" && argsArr[0] === "info") {
					(cb as (err: null, stdout: string, stderr: string) => void)(null, "ok", "");
					return undefined as never;
				}

				// Everything else fails
				(cb as (err: Error) => void)(new Error("not found"));
			}
			return undefined as never;
		});

		const result = await detectOCIRuntime();
		expect(result).not.toBeNull();
		expect(result?.name).toBe("docker");
	});

	it("prefers orbstack when orbctl is present", async () => {
		mockedExecFile.mockImplementation((cmd, args, optsOrCb, maybeCb) => {
			const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
			if (typeof cb === "function") {
				const cmdStr = String(cmd);
				const argsArr = args as string[];

				// `which orbctl` succeeds
				if (cmdStr === "which" && argsArr[0] === "orbctl") {
					(cb as (err: null, stdout: string, stderr: string) => void)(
						null,
						"/usr/local/bin/orbctl",
						""
					);
					return undefined as never;
				}

				// `docker info` succeeds (OrbStack provides docker CLI)
				if (cmdStr === "docker" && argsArr[0] === "info") {
					(cb as (err: null, stdout: string, stderr: string) => void)(null, "ok", "");
					return undefined as never;
				}

				(cb as (err: Error) => void)(new Error("not found"));
			}
			return undefined as never;
		});

		const result = await detectOCIRuntime();
		expect(result).not.toBeNull();
		expect(result?.name).toBe("orbstack");
	});

	it("returns specific runtime when preference given", async () => {
		mockedExecFile.mockImplementation((cmd, args, optsOrCb, maybeCb) => {
			const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
			if (typeof cb === "function") {
				if (String(cmd) === "podman" && (args as string[])[0] === "info") {
					(cb as (err: null, stdout: string, stderr: string) => void)(null, "ok", "");
					return undefined as never;
				}
				(cb as (err: Error) => void)(new Error("not found"));
			}
			return undefined as never;
		});

		const result = await detectOCIRuntime("podman");
		expect(result).not.toBeNull();
		expect(result?.name).toBe("podman");
	});

	it("returns null for unavailable preference", async () => {
		mockedExecFile.mockImplementation((_cmd, _args, optsOrCb, maybeCb) => {
			const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
			if (typeof cb === "function") {
				(cb as (err: Error) => void)(new Error("not found"));
			}
			return undefined as never;
		});

		const result = await detectOCIRuntime("podman");
		expect(result).toBeNull();
	});
});

describe("OCIProvider", () => {
	it("builds correct docker run args", async () => {
		const runtime = { name: "docker" as const, cmd: "docker" };
		const provider = new OCIProvider(runtime);

		let capturedArgs: string[] = [];
		mockedExecFile.mockImplementation((_cmd, args, optsOrCb, maybeCb) => {
			const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
			capturedArgs = args as string[];
			if (typeof cb === "function") {
				(cb as (err: null, stdout: string, stderr: string) => void)(null, "output", "");
			}
			return undefined as never;
		});

		await provider.execute({
			command: "audit ./skills --format json",
			skillsDir: "/tmp/skills",
			timeout: 60,
			networkAccess: false,
			env: { ANTHROPIC_API_KEY: "sk-test" },
		});

		expect(capturedArgs).toContain("--rm");
		expect(capturedArgs).toContain("--network");
		expect(capturedArgs).toContain("none");
		expect(capturedArgs.join(" ")).toContain("/tmp/skills:/skills:ro");
		expect(capturedArgs).toContain("ANTHROPIC_API_KEY=sk-test");
		expect(capturedArgs).toContain("node:22-alpine");
	});

	it("allows network when networkAccess is true", async () => {
		const runtime = { name: "docker" as const, cmd: "docker" };
		const provider = new OCIProvider(runtime);

		let capturedArgs: string[] = [];
		mockedExecFile.mockImplementation((_cmd, args, optsOrCb, maybeCb) => {
			const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
			capturedArgs = args as string[];
			if (typeof cb === "function") {
				(cb as (err: null, stdout: string, stderr: string) => void)(null, "", "");
			}
			return undefined as never;
		});

		await provider.execute({
			command: "audit ./skills",
			skillsDir: "/tmp/skills",
			timeout: 60,
			networkAccess: true,
		});

		expect(capturedArgs).not.toContain("--network");
	});

	it("reports correct provider name", () => {
		const provider = new OCIProvider({ name: "podman", cmd: "podman" });
		expect(provider.name).toBe("podman");
	});
});
