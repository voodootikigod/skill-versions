import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import type { GraderResult } from "../types.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_HEAP_MB = 256;

/**
 * Worker bootstrap. Runs in a thread with a dropped environment (no secrets),
 * a bounded heap, and an enforced timeout. It dynamically imports the
 * skill-author-supplied module and invokes its grade() export, then posts the
 * result back. Dropping the environment removes the credential-exfiltration
 * vector (API keys, tokens) even though the grader still runs author code —
 * full filesystem/network isolation requires --isolation (a container).
 */
const WORKER_SOURCE = `
const { parentPort, workerData } = require("node:worker_threads");
(async () => {
	try {
		const mod = await import(workerData.moduleUrl);
		if (typeof mod.grade !== "function") {
			parentPort.postMessage({ ok: false, reason: "no-grade" });
			return;
		}
		const result = await mod.grade({ workDir: workerData.workDir });
		parentPort.postMessage({
			ok: true,
			result: {
				passed: Boolean(result && result.passed),
				message: result && result.message != null ? String(result.message) : "",
				detail: result && result.detail != null ? String(result.detail) : undefined,
			},
		});
	} catch (error) {
		parentPort.postMessage({
			ok: false,
			reason: "error",
			message: error instanceof Error ? error.message : String(error),
		});
	}
})();
`;

interface WorkerOk {
	ok: true;
	result: { passed: boolean; message: string; detail?: string };
}
interface WorkerErr {
	message?: string;
	ok: false;
	reason: "no-grade" | "error";
}
type WorkerMessage = WorkerOk | WorkerErr;

/**
 * Load and execute a custom grader module in a sandboxed worker thread.
 * The module should export a `grade(context)` function returning a GraderResult.
 *
 * Gating to even reach this function happens in the runner (default-deny behind
 * --allow-custom-graders); this layer adds defense-in-depth: a dropped
 * environment, a heap cap, and a hard timeout.
 */
export function gradeCustom(
	workDir: string,
	modulePath: string,
	timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<GraderResult> {
	const moduleUrl = pathToFileURL(modulePath).href;

	return new Promise<GraderResult>((resolve) => {
		let settled = false;
		const finish = (result: GraderResult): void => {
			if (settled) {
				return;
			}
			settled = true;
			// Best-effort terminate; ignore errors from an already-exited worker.
			worker.terminate().catch(() => undefined);
			clearTimeout(timer);
			resolve(result);
		};

		const worker = new Worker(WORKER_SOURCE, {
			eval: true,
			workerData: { moduleUrl, workDir },
			env: {}, // drop all environment variables — no secrets reach author code
			argv: [],
			resourceLimits: { maxOldGenerationSizeMb: MAX_HEAP_MB },
		});

		const timer = setTimeout(() => {
			finish({
				grader: "custom",
				passed: false,
				message: `Custom grader "${modulePath}" timed out after ${timeoutMs}ms`,
			});
		}, timeoutMs);

		worker.on("message", (msg: WorkerMessage) => {
			if (msg.ok) {
				finish({
					grader: "custom",
					passed: msg.result.passed,
					message: msg.result.message,
					detail: msg.result.detail,
				});
				return;
			}
			if (msg.reason === "no-grade") {
				finish({
					grader: "custom",
					passed: false,
					message: `Custom grader module "${modulePath}" does not export a grade() function`,
				});
				return;
			}
			finish({
				grader: "custom",
				passed: false,
				message: `Custom grader "${modulePath}" failed to execute`,
				detail: msg.message,
			});
		});

		worker.on("error", (error: Error) => {
			finish({
				grader: "custom",
				passed: false,
				message: `Custom grader "${modulePath}" failed to execute`,
				detail: error.message,
			});
		});

		worker.on("exit", (code: number) => {
			if (code !== 0) {
				finish({
					grader: "custom",
					passed: false,
					message: `Custom grader "${modulePath}" exited unexpectedly (code ${code})`,
				});
			}
		});
	});
}
