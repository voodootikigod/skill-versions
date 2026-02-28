import { readFile, writeFile } from "node:fs/promises";
import type { Registry } from "./types.js";

const REGISTRY_FILENAME = "skill-versions.json";

/**
 * Load and validate a skill-versions.json registry file.
 */
export async function loadRegistry(path?: string): Promise<Registry> {
	const filePath = path ?? REGISTRY_FILENAME;

	let raw: string;
	try {
		raw = await readFile(filePath, "utf-8");
	} catch {
		throw new Error(
			`Registry file not found: ${filePath}\nRun "skill-versions init" to create one.`,
		);
	}

	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		throw new Error(`Invalid JSON in registry file: ${filePath}`);
	}

	return validateRegistry(data, filePath);
}

/**
 * Validate that parsed JSON matches the Registry schema.
 */
function validateRegistry(data: unknown, filePath: string): Registry {
	if (!data || typeof data !== "object") {
		throw new Error(`Registry file is not a valid object: ${filePath}`);
	}

	const reg = data as Record<string, unknown>;

	if (reg.version !== 1) {
		throw new Error(`Unsupported registry version: ${reg.version} (expected 1)`);
	}

	if (!reg.products || typeof reg.products !== "object") {
		throw new Error(`Registry is missing "products" object: ${filePath}`);
	}

	const products = reg.products as Record<string, unknown>;

	for (const [key, value] of Object.entries(products)) {
		if (!value || typeof value !== "object") {
			throw new Error(`Invalid product entry: ${key}`);
		}

		const product = value as Record<string, unknown>;
		const required = ["displayName", "package", "verifiedVersion", "verifiedAt", "skills"];

		for (const field of required) {
			if (!(field in product)) {
				throw new Error(`Product "${key}" is missing required field: ${field}`);
			}
		}

		if (!Array.isArray(product.skills)) {
			throw new Error(`Product "${key}": skills must be an array`);
		}
	}

	return data as unknown as Registry;
}

/**
 * Save a registry to disk.
 */
export async function saveRegistry(registry: Registry, path?: string): Promise<string> {
	const filePath = path ?? REGISTRY_FILENAME;
	const content = JSON.stringify(registry, null, 2) + "\n";
	await writeFile(filePath, content, "utf-8");
	return filePath;
}
