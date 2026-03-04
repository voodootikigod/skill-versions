import { extractPackages } from "../../audit/extractors/packages.js";

// Check for product name + version patterns (e.g., "Next.js 15", "React 19.x", "AI SDK 6.1")
const PRODUCT_VERSION_RE =
	/(?:Next\.js|React|Vue|Angular|Svelte|Express|Django|Flask|Rails|Laravel|Spring|Nuxt|Remix|Astro|Vite|Webpack|Rollup|esbuild|Turbopack|Deno|Bun|Node\.js|TypeScript|Python|Rust|Go|Java|AI SDK|Vercel AI|LangChain|LlamaIndex|OpenAI|Anthropic|TensorFlow|PyTorch)\s+\d+[\w.x-]*/i;

// Check for semver-like version references in context (e.g., "version 4.2.0", "v3.x")
const VERSION_REF_RE = /\b(?:version|v)\s*\d+(?:\.[xX\d]+)+(?:-[\w.]+)?\b/i;

/**
 * Detect whether a skill file references a specific product.
 *
 * Returns true if the content contains product name + version patterns,
 * install commands for specific packages, or other product-specific references.
 * Used to determine whether `product-version` frontmatter is conditionally required.
 */
export function detectsProduct(content: string): boolean {
	// Check for install commands via the existing package extractor
	const packages = extractPackages(content);
	if (packages.length > 0) {
		return true;
	}

	if (PRODUCT_VERSION_RE.test(content)) {
		return true;
	}

	if (VERSION_REF_RE.test(content)) {
		return true;
	}

	return false;
}
