import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createGenerator } from "ts-json-schema-generator";

const config = {
	path: resolve(import.meta.dirname, "types.ts"),
	tsconfig: resolve(import.meta.dirname, "../tsconfig.json"),
	type: "*",
};

const generator = createGenerator(config);
const schema = generator.createSchema(config.type);

const outDir = resolve(import.meta.dirname, "../dist");
const outPath = resolve(outDir, "schema.json");

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`);

console.log(`Generated ${outPath}`);
