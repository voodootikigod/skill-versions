import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import chalk from "chalk";
import { saveRegistry } from "../registry.js";
import { groupSkills, scanSkills } from "../scanner.js";
import type { Registry, RegistryProduct, ScannedSkill } from "../types.js";

interface InitOptions {
	yes?: boolean;
	output?: string;
}

/**
 * Common package name mappings for auto-detection.
 * Keys are matched against skill name prefixes and product names.
 */
const KNOWN_MAPPINGS: Record<string, { displayName: string; package: string }> = {
	"ai-sdk": { displayName: "Vercel AI SDK", package: "ai" },
	nextjs: { displayName: "Next.js", package: "next" },
	streamdown: { displayName: "Streamdown", package: "streamdown" },
	"vercel-blob": { displayName: "Vercel Blob", package: "@vercel/blob" },
	"edge-config": { displayName: "Edge Config", package: "@vercel/edge-config" },
	"upstash-redis": { displayName: "Upstash Redis", package: "@upstash/redis" },
	"neon-postgres": { displayName: "Neon Postgres", package: "@neondatabase/serverless" },
	turborepo: { displayName: "TurboRepo", package: "turbo" },
	payload: { displayName: "Payload CMS", package: "payload" },
	shadcn: { displayName: "shadcn/ui", package: "shadcn" },
	geistcn: { displayName: "@vercel/geistcn", package: "@vercel/geistcn" },
	"json-render": { displayName: "json-render", package: "@anthropic-ai/json-render" },
	"vercel-sandbox": { displayName: "Vercel Sandbox", package: "@vercel/sandbox" },
	sandbox: { displayName: "Vercel Sandbox", package: "@vercel/sandbox" },
	workflow: { displayName: "Vercel Workflow", package: "@vercel/workflow" },
	"vercel-analytics": { displayName: "Vercel Analytics", package: "@vercel/analytics" },
	firewall: { displayName: "Vercel Firewall", package: "@vercel/firewall" },
	"ai-elements": { displayName: "AI Elements", package: "@vercel/ai-elements" },
	"agent-browser": { displayName: "agent-browser", package: "agent-browser" },
	functions: { displayName: "Vercel Functions", package: "vercel" },
	edge: { displayName: "Vercel Edge Runtime", package: "edge-runtime" },
	microfrontends: { displayName: "Vercel Microfrontends", package: "@vercel/microfrontends" },
	mermaid: { displayName: "Mermaid", package: "mermaid" },
};

/**
 * Try to auto-detect package info from a product key.
 */
function autoDetect(productKey: string): { displayName: string; package: string } | undefined {
	// Direct match
	if (KNOWN_MAPPINGS[productKey]) return KNOWN_MAPPINGS[productKey];

	// Try progressively shorter prefixes
	const parts = productKey.split("-");
	for (let len = parts.length - 1; len >= 1; len--) {
		const prefix = parts.slice(0, len).join("-");
		if (KNOWN_MAPPINGS[prefix]) return KNOWN_MAPPINGS[prefix];
	}

	return undefined;
}

/**
 * Initialize a skill-versions.json registry by scanning a skills directory.
 */
export async function initCommand(dir: string, options: InitOptions): Promise<number> {
	console.log();
	console.log(chalk.bold("skill-versions init"));
	console.log("=".repeat(50));
	console.log();
	console.log(`Scanning ${chalk.cyan(dir)} for SKILL.md files...`);

	const skills = await scanSkills(dir);

	if (skills.length === 0) {
		console.error(chalk.red("No SKILL.md files found."));
		return 2;
	}

	const withVersion = skills.filter((s) => s.productVersion);
	const withoutVersion = skills.filter((s) => !s.productVersion);

	console.log(
		`Found ${chalk.bold(String(skills.length))} skills, ${chalk.bold(String(withVersion.length))} with product-version.`,
	);

	if (withoutVersion.length > 0) {
		console.log(
			chalk.dim(
				`  Skipping ${withoutVersion.length} without product-version: ${withoutVersion.map((s) => s.name).join(", ")}`,
			),
		);
	}

	console.log();

	// Group skills by inferred product (shared prefix + version)
	const versionGroups = groupSkills(withVersion);
	const products: Record<string, RegistryProduct> = {};
	const now = new Date().toISOString();

	// Reverse lookup: npm package name -> product key in registry
	const packageToKey = new Map<string, string>();

	if (options.yes) {
		// Non-interactive: auto-detect mappings
		for (const [productKey, groupSkillsList] of versionGroups) {
			const detected = autoDetect(productKey);
			const version = groupSkillsList[0]?.productVersion ?? "unknown";

			if (!detected) {
				console.log(
					chalk.yellow(
						`  Skipping "${productKey}" (v${version}) — cannot auto-detect npm package`,
					),
				);
				continue;
			}

			// Merge into existing entry if same npm package was already mapped
			const existingKey = packageToKey.get(detected.package);
			if (existingKey && products[existingKey]) {
				const existing = products[existingKey];
				for (const s of groupSkillsList) {
					if (!existing.skills.includes(s.name)) {
						existing.skills.push(s.name);
					}
				}
				console.log(
					`  ${chalk.green("✓")} ${detected.displayName} v${version} → ${chalk.cyan(detected.package)} (+${groupSkillsList.length} skills, merged)`,
				);
				continue;
			}

			packageToKey.set(detected.package, productKey);
			products[productKey] = {
				displayName: detected.displayName,
				package: detected.package,
				verifiedVersion: version,
				verifiedAt: now,
				skills: groupSkillsList.map((s) => s.name),
			};

			console.log(
				`  ${chalk.green("✓")} ${detected.displayName} v${version} → ${chalk.cyan(detected.package)} (${groupSkillsList.length} skills)`,
			);
		}
	} else {
		// Interactive: prompt for each mapping
		const rl = createInterface({ input: stdin, output: stdout });

		try {
			for (const [productKey, groupSkillsList] of versionGroups) {
				const detected = autoDetect(productKey);
				const version = groupSkillsList[0]?.productVersion ?? "unknown";
				const defaultPkg = detected?.package;
				const defaultName = detected?.displayName ?? productKey;
				const hint = defaultPkg ? ` [${defaultPkg}]` : "";
				const skillNames = groupSkillsList.map((s) => s.name).join(", ");

				console.log(
					`  ${chalk.bold(defaultName)} v${version} (${groupSkillsList.length} skills: ${chalk.dim(skillNames)})`,
				);

				const answer = await rl.question(`    npm package${hint}: `);
				const packageName = answer.trim() || defaultPkg;

				if (!packageName) {
					console.log(chalk.yellow(`    Skipping — no package specified`));
					console.log();
					continue;
				}

				// Merge into existing entry if same npm package was already mapped
				const existingKey = packageToKey.get(packageName);
				if (existingKey && products[existingKey]) {
					const existing = products[existingKey];
					for (const s of groupSkillsList) {
						if (!existing.skills.includes(s.name)) {
							existing.skills.push(s.name);
						}
					}
					console.log(chalk.green(`    ✓ Merged into existing "${existingKey}"`));
					console.log();
					continue;
				}

				const nameAnswer = await rl.question(
					`    display name [${defaultName}]: `,
				);
				const displayName = nameAnswer.trim() || defaultName;

				packageToKey.set(packageName, productKey);
				products[productKey] = {
					displayName,
					package: packageName,
					verifiedVersion: version,
					verifiedAt: now,
					skills: groupSkillsList.map((s) => s.name),
				};

				console.log(chalk.green(`    ✓ Mapped`));
				console.log();
			}
		} finally {
			rl.close();
		}
	}

	const productCount = Object.keys(products).length;

	if (productCount === 0) {
		console.error(chalk.red("\nNo products mapped. Registry not created."));
		return 2;
	}

	const registry: Registry = {
		$schema: "https://skill-versions.com/schema.json",
		version: 1,
		lastCheck: now,
		products,
	};

	const outputPath = await saveRegistry(registry, options.output);

	console.log();
	console.log(chalk.green(`Created ${outputPath} with ${productCount} products.`));
	console.log(chalk.dim('Run "skill-versions check" to check for updates.'));
	console.log();

	return 0;
}
