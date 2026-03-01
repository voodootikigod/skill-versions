import { createRequire } from "node:module";
import { Command } from "commander";
import { checkCommand } from "./commands/check.js";
import { initCommand } from "./commands/init.js";
import { reportCommand } from "./commands/report.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const program = new Command();

program
	.name("skill-versions")
	.description("Freshness checker for Agent Skills — like npm outdated for skill knowledge")
	.version(version);

program
	.command("check")
	.description("Check skill versions against npm registry")
	.option("-r, --registry <path>", "path to skill-versions.json")
	.option("-p, --product <name>", "check a single product")
	.option("--json", "output results as JSON")
	.option("-v, --verbose", "show all products including current")
	.option("--ci", "exit code 1 if any stale products found")
	.action(async (options) => {
		try {
			const code = await checkCommand(options);
			process.exit(code);
		} catch (error) {
			console.error(
				`Error: ${error instanceof Error ? error.message : String(error)}`,
			);
			process.exit(2);
		}
	});

program
	.command("init")
	.description("Scan skills directory and generate a skill-versions.json registry")
	.argument("[dir]", "skills directory to scan", "./skills")
	.option("-y, --yes", "non-interactive mode, auto-detect package mappings")
	.option("-o, --output <path>", "output path for registry file")
	.action(async (dir, options) => {
		try {
			const code = await initCommand(dir, options);
			process.exit(code);
		} catch (error) {
			console.error(
				`Error: ${error instanceof Error ? error.message : String(error)}`,
			);
			process.exit(2);
		}
	});

program
	.command("report")
	.description("Generate a full staleness report")
	.option("-r, --registry <path>", "path to skill-versions.json")
	.option("-f, --format <type>", "output format: json or markdown", "markdown")
	.action(async (options) => {
		try {
			const code = await reportCommand(options);
			process.exit(code);
		} catch (error) {
			console.error(
				`Error: ${error instanceof Error ? error.message : String(error)}`,
			);
			process.exit(2);
		}
	});

program.parse();
