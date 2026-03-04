import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

export function getCacheDir(): string {
	return join(homedir(), ".cache", "skills-check", "audit");
}

interface CacheEntry {
	timestamp: number;
	value: boolean;
}

let dirEnsured = false;

export function resetCacheState(): void {
	dirEnsured = false;
}

async function ensureCacheDir(): Promise<void> {
	if (dirEnsured) {
		return;
	}
	try {
		await mkdir(getCacheDir(), { recursive: true });
		dirEnsured = true;
	} catch {
		// Cache dir creation failed — will fall through to in-memory only
	}
}

function cacheFilePath(ecosystem: string, name: string): string {
	const safeName = name.replace(/\//g, "__");
	return join(getCacheDir(), `${ecosystem}_${safeName}.json`);
}

export async function getCached(
	ecosystem: string,
	name: string,
	ttlMs = DEFAULT_TTL_MS
): Promise<boolean | undefined> {
	try {
		const path = cacheFilePath(ecosystem, name);
		const raw = await readFile(path, "utf-8");
		const entry: CacheEntry = JSON.parse(raw);

		if (Date.now() - entry.timestamp >= ttlMs) {
			return undefined; // expired
		}

		return entry.value;
	} catch {
		return undefined; // cache miss
	}
}

export async function setCached(ecosystem: string, name: string, value: boolean): Promise<void> {
	await ensureCacheDir();
	try {
		const path = cacheFilePath(ecosystem, name);
		const entry: CacheEntry = { value, timestamp: Date.now() };
		await writeFile(path, JSON.stringify(entry), "utf-8");
	} catch {
		// Silently fail — cache is advisory
	}
}

interface JsonCacheEntry {
	data: unknown;
	timestamp: number;
}

export async function getJsonCached(
	ecosystem: string,
	name: string,
	ttlMs = DEFAULT_TTL_MS
): Promise<unknown | undefined> {
	try {
		const path = cacheFilePath(ecosystem, name);
		const raw = await readFile(path, "utf-8");
		const entry: JsonCacheEntry = JSON.parse(raw);

		if (Date.now() - entry.timestamp >= ttlMs) {
			return undefined; // expired
		}

		return entry.data;
	} catch {
		return undefined; // cache miss
	}
}

export async function setJsonCached(ecosystem: string, name: string, data: unknown): Promise<void> {
	await ensureCacheDir();
	try {
		const path = cacheFilePath(ecosystem, name);
		const entry: JsonCacheEntry = { data, timestamp: Date.now() };
		await writeFile(path, JSON.stringify(entry), "utf-8");
	} catch {
		// Silently fail — cache is advisory
	}
}
