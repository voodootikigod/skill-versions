import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_MEM_CACHE_SIZE = 1000;

let bypassCache = false;
let disableCache = false;

export function configureCache(options: { force?: boolean; noCache?: boolean }): void {
	if (options.force !== undefined) {
		bypassCache = options.force;
	}
	if (options.noCache !== undefined) {
		disableCache = options.noCache;
	}
}

export function getCacheDir(): string {
	return join(homedir(), ".cache", "skills-check", "audit");
}

interface CacheEntry {
	timestamp: number;
	value: boolean;
}

interface JsonCacheEntry {
	data: unknown;
	timestamp: number;
}

const booleanMemoryCache = new Map<string, CacheEntry>();
const jsonMemoryCache = new Map<string, JsonCacheEntry>();

let dirEnsured = false;

export function resetCacheState(): void {
	dirEnsured = false;
	booleanMemoryCache.clear();
	jsonMemoryCache.clear();
}

function addToMemCache<K, V>(map: Map<K, V>, key: K, value: V): void {
	if (map.size >= MAX_MEM_CACHE_SIZE) {
		const firstKey = map.keys().next().value;
		if (firstKey !== undefined) {
			map.delete(firstKey);
		}
	}
	map.set(key, value);
}

async function ensureCacheDir(): Promise<void> {
	if (dirEnsured) {
		return;
	}
	try {
		await mkdir(getCacheDir(), { recursive: true, mode: 0o700 });
		dirEnsured = true;
	} catch {
		// Cache dir creation failed — will fall through to in-memory only
	}
}

function cacheFilePath(ecosystem: string, name: string): string {
	const hash = createHash("sha256").update(`${ecosystem}:${name}`).digest("hex");
	return join(getCacheDir(), `${hash}.json`);
}

export async function getCached(
	ecosystem: string,
	name: string,
	ttlMs = DEFAULT_TTL_MS
): Promise<boolean | undefined> {
	if (disableCache || bypassCache) {
		return undefined;
	}
	const cacheKey = `${ecosystem}:${name}`;
	const memoryEntry = process.env.VITEST ? undefined : booleanMemoryCache.get(cacheKey);
	if (memoryEntry !== undefined) {
		if (Date.now() - memoryEntry.timestamp >= ttlMs) {
			booleanMemoryCache.delete(cacheKey);
			return undefined; // expired
		}
		return memoryEntry.value;
	}

	const path = cacheFilePath(ecosystem, name);
	let raw: string;
	try {
		raw = await readFile(path, "utf-8");
	} catch {
		return undefined; // cache miss
	}

	try {
		const entry = JSON.parse(raw);
		if (Date.now() - entry.timestamp >= ttlMs) {
			return undefined; // expired
		}
		addToMemCache(booleanMemoryCache, cacheKey, entry);
		return entry.value;
	} catch (_err) {
		try {
			await unlink(path);
		} catch {
			// ignore unlink failure
		}
		return undefined;
	}
}

export async function setCached(ecosystem: string, name: string, value: boolean): Promise<void> {
	if (disableCache) {
		return;
	}
	const cacheKey = `${ecosystem}:${name}`;
	const entry: CacheEntry = { value, timestamp: Date.now() };
	addToMemCache(booleanMemoryCache, cacheKey, entry);

	await ensureCacheDir();
	try {
		const path = cacheFilePath(ecosystem, name);
		await writeFile(path, JSON.stringify(entry), "utf-8");
	} catch {
		// Silently fail — cache is advisory
	}
}

export async function getJsonCached(
	ecosystem: string,
	name: string,
	ttlMs = DEFAULT_TTL_MS
): Promise<unknown | undefined> {
	if (disableCache || bypassCache) {
		return undefined;
	}
	const cacheKey = `${ecosystem}:${name}`;
	const memoryEntry = process.env.VITEST ? undefined : jsonMemoryCache.get(cacheKey);
	if (memoryEntry !== undefined) {
		if (Date.now() - memoryEntry.timestamp >= ttlMs) {
			jsonMemoryCache.delete(cacheKey);
			return undefined; // expired
		}
		return memoryEntry.data;
	}

	const path = cacheFilePath(ecosystem, name);
	let raw: string;
	try {
		raw = await readFile(path, "utf-8");
	} catch {
		return undefined; // cache miss
	}

	try {
		const entry = JSON.parse(raw);
		if (Date.now() - entry.timestamp >= ttlMs) {
			return undefined; // expired
		}
		addToMemCache(jsonMemoryCache, cacheKey, entry);
		return entry.data;
	} catch (_err) {
		try {
			await unlink(path);
		} catch {
			// ignore unlink failure
		}
		return undefined;
	}
}

export async function setJsonCached(ecosystem: string, name: string, data: unknown): Promise<void> {
	if (disableCache) {
		return;
	}
	const cacheKey = `${ecosystem}:${name}`;
	const entry: JsonCacheEntry = { data, timestamp: Date.now() };
	addToMemCache(jsonMemoryCache, cacheKey, entry);

	await ensureCacheDir();
	try {
		const path = cacheFilePath(ecosystem, name);
		await writeFile(path, JSON.stringify(entry), "utf-8");
	} catch {
		// Silently fail — cache is advisory
	}
}
