import type { LanguageModel } from "ai";

interface ProviderConfig {
	defaultModel: string;
	envVar: string;
	factory: string;
	id: string;
	pkg: string;
}

const PROVIDERS: ProviderConfig[] = [
	{
		id: "anthropic",
		envVar: "ANTHROPIC_API_KEY",
		pkg: "@ai-sdk/anthropic",
		factory: "anthropic",
		defaultModel: "claude-sonnet-4-20250514",
	},
	{
		id: "openai",
		envVar: "OPENAI_API_KEY",
		pkg: "@ai-sdk/openai",
		factory: "openai",
		defaultModel: "gpt-4o",
	},
	{
		id: "google",
		envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
		pkg: "@ai-sdk/google",
		factory: "google",
		defaultModel: "gemini-2.5-flash",
	},
];

export interface DetectedProvider {
	hasApiKey: boolean;
	hasSdk: boolean;
	id: string;
}

/**
 * Detect which LLM providers are available based on env vars and installed SDKs.
 */
export async function detectProviders(): Promise<DetectedProvider[]> {
	const results: DetectedProvider[] = [];

	for (const provider of PROVIDERS) {
		const hasApiKey = !!process.env[provider.envVar];
		let hasSdk = false;

		try {
			await import(provider.pkg);
			hasSdk = true;
		} catch {
			// SDK not installed
		}

		results.push({ id: provider.id, hasApiKey, hasSdk });
	}

	return results;
}

/**
 * Resolve a LanguageModel instance based on provider and model flags.
 * Auto-detects if no explicit provider is given.
 *
 * @throws Error if no provider is available or SDK is missing.
 */
export async function resolveModel(
	providerFlag?: string,
	modelFlag?: string
): Promise<LanguageModel> {
	// Find the provider config
	let config: ProviderConfig | undefined;

	if (providerFlag) {
		config = PROVIDERS.find((p) => p.id === providerFlag);
		if (!config) {
			const valid = PROVIDERS.map((p) => p.id).join(", ");
			throw new Error(`Unknown provider "${providerFlag}". Valid providers: ${valid}`);
		}
	} else {
		// Auto-detect: find first provider with both API key and SDK
		for (const provider of PROVIDERS) {
			if (process.env[provider.envVar]) {
				try {
					await import(provider.pkg);
					config = provider;
					break;
				} catch {
					// SDK not installed, try next
				}
			}
		}

		if (!config) {
			throw new Error(
				"No LLM provider detected. Set up a provider:\n\n" +
					"  1. Install a provider SDK:\n" +
					"     npm install @ai-sdk/anthropic    # for Claude\n" +
					"     npm install @ai-sdk/openai       # for GPT\n" +
					"     npm install @ai-sdk/google       # for Gemini\n\n" +
					"  2. Set the API key environment variable:\n" +
					"     export ANTHROPIC_API_KEY=sk-...\n" +
					"     export OPENAI_API_KEY=sk-...\n" +
					"     export GOOGLE_GENERATIVE_AI_API_KEY=...\n"
			);
		}
	}

	// Verify API key is set
	if (!process.env[config.envVar]) {
		throw new Error(
			`API key not found. Set ${config.envVar} environment variable for ${config.id}.`
		);
	}

	// Dynamically import the provider SDK
	let providerModule: Record<string, unknown>;
	try {
		providerModule = (await import(config.pkg)) as Record<string, unknown>;
	} catch {
		throw new Error(`Provider SDK not installed. Run: npm install ${config.pkg}`);
	}

	// Get the provider factory function
	const factory = providerModule[config.factory];
	if (typeof factory !== "function") {
		throw new Error(`Could not load provider factory from ${config.pkg}`);
	}

	const modelId = modelFlag ?? config.defaultModel;
	return factory(modelId) as LanguageModel;
}

/**
 * Get the provider config list (useful for help text).
 */
export function getProviderIds(): string[] {
	return PROVIDERS.map((p) => p.id);
}
