import chalk from "chalk";
import { AppleContainerProvider } from "./providers/apple.js";
import { LocalProvider } from "./providers/local.js";
import { detectOCIRuntime, OCIProvider } from "./providers/oci.js";
import { VercelSandboxProvider } from "./providers/vercel.js";
import type { IsolationChoice, IsolationProvider, IsolationProviderName } from "./types.js";

const VALID_CHOICES = new Set<IsolationChoice>([
	"auto",
	"oci",
	"apple-container",
	"docker",
	"podman",
	"orbstack",
	"rancher",
	"nerdctl",
	"cri-o",
	"vercel-sandbox",
	"local",
]);

const OCI_NAMES = new Set(["docker", "podman", "orbstack", "rancher", "nerdctl", "cri-o"]);

/**
 * Auto-detect the best available provider via waterfall:
 *   1. Apple Containers → 2. OCI runtime → 3. Vercel Sandbox → 4. Local
 */
async function autoDetect(verbose: boolean): Promise<IsolationProvider> {
	if (verbose) {
		console.error(chalk.dim("Isolation: detecting available providers..."));
	}

	const apple = new AppleContainerProvider();
	if (await apple.available()) {
		if (verbose) {
			console.error(chalk.dim("Isolation: using Apple Containers (containerctl)"));
		}
		return apple;
	}

	const ociRuntime = await detectOCIRuntime();
	if (ociRuntime) {
		if (verbose) {
			console.error(chalk.dim(`Isolation: using OCI runtime "${ociRuntime.name}"`));
		}
		return new OCIProvider(ociRuntime);
	}

	const vercel = new VercelSandboxProvider();
	if (await vercel.available()) {
		if (verbose) {
			console.error(chalk.dim("Isolation: using Vercel Sandbox"));
		}
		return vercel;
	}

	if (verbose) {
		console.error(
			chalk.yellow("Isolation: no container runtime found, running locally without isolation")
		);
	}
	return new LocalProvider(true);
}

/**
 * Select the best available isolation provider based on user preference.
 */
export async function selectProvider(
	choice: IsolationChoice = "auto",
	verbose = false
): Promise<IsolationProvider> {
	if (!VALID_CHOICES.has(choice)) {
		throw new Error(
			`Invalid --isolation value: "${choice}". Valid options: ${[...VALID_CHOICES].join(", ")}`
		);
	}

	if (choice === "local") {
		return new LocalProvider();
	}

	if (choice === "auto") {
		return autoDetect(verbose);
	}

	if (choice === "apple-container") {
		const provider = new AppleContainerProvider();
		if (await provider.available()) {
			return provider;
		}
		throw new Error("Apple Containers (containerctl) not available on this system");
	}

	if (choice === "vercel-sandbox") {
		const provider = new VercelSandboxProvider();
		if (await provider.available()) {
			return provider;
		}
		throw new Error("Vercel Sandbox not available. Set VERCEL_TOKEN or run `vercel login`.");
	}

	if (OCI_NAMES.has(choice)) {
		const runtime = await detectOCIRuntime(choice as IsolationProviderName);
		if (runtime) {
			return new OCIProvider(runtime);
		}
		throw new Error(`OCI runtime "${choice}" not available. Ensure the daemon is running.`);
	}

	// "oci" — auto-detect among OCI runtimes only
	const runtime = await detectOCIRuntime();
	if (runtime) {
		if (verbose) {
			console.error(chalk.dim(`Isolation: detected OCI runtime "${runtime.name}"`));
		}
		return new OCIProvider(runtime);
	}
	throw new Error(
		"No OCI container runtime found. Install Docker, Podman, OrbStack, or Rancher Desktop."
	);
}
