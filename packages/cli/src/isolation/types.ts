/**
 * Supported isolation provider names.
 * - "apple-container": macOS 26+ lightweight containers via containerctl
 * - OCI runtimes: "docker", "podman", "orbstack", "rancher", "nerdctl", "cri-o"
 * - "vercel-sandbox": Vercel's cloud sandbox (requires VERCEL_TOKEN)
 * - "local": No isolation, run in the current process (fallback)
 */
export type IsolationProviderName =
	| "apple-container"
	| "docker"
	| "podman"
	| "orbstack"
	| "rancher"
	| "nerdctl"
	| "cri-o"
	| "vercel-sandbox"
	| "local";

/**
 * User-facing --isolation flag values.
 * "auto" triggers the detection waterfall; "oci" auto-detects among OCI runtimes.
 */
export type IsolationChoice = "auto" | "oci" | IsolationProviderName;

export const OCI_PROVIDER_NAMES = new Set<IsolationProviderName>([
	"docker",
	"podman",
	"orbstack",
	"rancher",
	"nerdctl",
	"cri-o",
]);

export interface IsolationExecuteOptions {
	/** The full skills-check CLI command (e.g. "audit ./skills --format json") */
	command: string;
	/** Environment variables to forward (API keys, etc.) */
	env?: Record<string, string>;
	/** Whether the command needs outbound network access */
	networkAccess: boolean;
	/** Directory containing skill files — mounted read-only into the container */
	skillsDir: string;
	/** Timeout in seconds */
	timeout: number;
	/** Writable work directory for test harnesses */
	workDir?: string;
}

export interface IsolationResult {
	/** Paths to files produced inside the container and copied back */
	artifacts?: string[];
	exitCode: number;
	/** Which provider actually ran the command */
	provider: IsolationProviderName;
	stderr: string;
	stdout: string;
}

/**
 * An isolation provider that can run skills-check commands in a sandboxed environment.
 */
export interface IsolationProvider {
	/** Check whether this provider's runtime is available on the current machine. */
	available(): Promise<boolean>;
	/** Execute a skills-check command inside the isolated environment. */
	execute(options: IsolationExecuteOptions): Promise<IsolationResult>;
	/** True when this provider was selected as a fallback (no isolation runtimes found). */
	readonly isFallback: boolean;
	readonly name: IsolationProviderName;
}
