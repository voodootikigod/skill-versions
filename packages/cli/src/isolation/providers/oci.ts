import { execFile } from "node:child_process";
import type {
	IsolationExecuteOptions,
	IsolationProvider,
	IsolationProviderName,
	IsolationResult,
} from "../types.js";

/**
 * Configuration for a single OCI-compatible container runtime.
 */
export interface OCIRuntimeConfig {
	/** Primary CLI command for running containers */
	cmd: string;
	/** Optional detection command — if present, checked first to identify the runtime */
	detect?: string;
	/** Provider name for reporting */
	name: IsolationProviderName;
}

/**
 * OCI runtimes in detection priority order.
 *
 * OrbStack and Rancher Desktop both expose a Docker-compatible `docker` CLI,
 * so we detect their management CLIs (`orbctl`, `rdctl`) first to accurately
 * identify which runtime is in use. containerd is surfaced via `nerdctl`
 * (its Docker-compatible CLI). CRI-O via `crictl` is ranked last as it's
 * primarily a Kubernetes node runtime, not designed for standalone use.
 */
export const OCI_RUNTIMES: readonly OCIRuntimeConfig[] = [
	{ name: "orbstack", cmd: "docker", detect: "orbctl" },
	{ name: "rancher", cmd: "docker", detect: "rdctl" },
	{ name: "docker", cmd: "docker" },
	{ name: "podman", cmd: "podman" },
	{ name: "nerdctl", cmd: "nerdctl" },
	{ name: "cri-o", cmd: "crictl" },
];

function commandExists(cmd: string): Promise<boolean> {
	return new Promise((resolve) => {
		const whichCmd = process.platform === "win32" ? "where" : "which";
		execFile(whichCmd, [cmd], (error) => resolve(!error));
	});
}

/**
 * Smoke-test that the container runtime daemon is running.
 * Runs `<cmd> info` and checks for a successful exit.
 */
function canRunContainers(cmd: string): Promise<boolean> {
	return new Promise((resolve) => {
		execFile(cmd, ["info"], { timeout: 5000 }, (error) => resolve(!error));
	});
}

/**
 * Detect the best available OCI runtime on this machine.
 * Returns the runtime config, or null if none found.
 */
export async function detectOCIRuntime(
	preference?: IsolationProviderName
): Promise<OCIRuntimeConfig | null> {
	// If the user requested a specific runtime, try only that one
	if (preference) {
		const match = OCI_RUNTIMES.find((r) => r.name === preference);
		if (!match) {
			return null;
		}
		if (await canRunContainers(match.cmd)) {
			return match;
		}
		return null;
	}

	// Waterfall: try each runtime in priority order
	for (const runtime of OCI_RUNTIMES) {
		// Check for the management CLI first (orbctl, rdctl)
		if (runtime.detect && !(await commandExists(runtime.detect))) {
			continue;
		}
		if (await canRunContainers(runtime.cmd)) {
			return runtime;
		}
	}

	return null;
}

/**
 * OCI container runtime provider.
 * Supports Docker, Podman, OrbStack, Rancher Desktop, nerdctl (containerd), and CRI-O.
 */
export class OCIProvider implements IsolationProvider {
	readonly name: IsolationProviderName;
	readonly isFallback = false;
	private readonly runtime: OCIRuntimeConfig;

	constructor(runtime: OCIRuntimeConfig) {
		this.name = runtime.name;
		this.runtime = runtime;
	}

	// biome-ignore lint/suspicious/useAwait: interface contract requires async
	async available(): Promise<boolean> {
		return canRunContainers(this.runtime.cmd);
	}

	async execute(options: IsolationExecuteOptions): Promise<IsolationResult> {
		const fullCommand = `npx skills-check ${options.command}`;
		const args = ["run", "--rm"];

		// Mount skills directory read-only
		args.push("-v", `${options.skillsDir}:/skills:ro`);

		// Mount writable work directory if provided
		if (options.workDir) {
			args.push("-v", `${options.workDir}:/work`);
		}

		// Network policy
		if (!options.networkAccess) {
			args.push("--network", "none");
		}

		// Forward environment variables
		if (options.env) {
			for (const [key, value] of Object.entries(options.env)) {
				args.push("-e", `${key}=${value}`);
			}
		}

		// Use a slim Node 22 image
		args.push("node:22-alpine");
		args.push("sh", "-c", `cd /skills && npm install -g skills-check && ${fullCommand}`);

		const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
			(resolve) => {
				execFile(
					this.runtime.cmd,
					args,
					{
						timeout: options.timeout * 1000,
						maxBuffer: 10 * 1024 * 1024,
					},
					(error, stdout, stderr) => {
						resolve({
							exitCode: error ? ((error as { code?: number }).code ?? 1) : 0,
							stdout: stdout ?? "",
							stderr: stderr ?? "",
						});
					}
				);
			}
		);

		return {
			...result,
			provider: this.name,
		};
	}
}
