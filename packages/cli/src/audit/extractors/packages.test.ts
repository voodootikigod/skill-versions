import { describe, expect, it } from "vitest";
import { extractPackages } from "./packages.js";

describe("extractPackages", () => {
	it("extracts npm install packages", () => {
		const content = "Run:\n```bash\nnpm install express\n```";
		const result = extractPackages(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			name: "express",
			ecosystem: "npm",
			line: 3,
		});
	});

	it("extracts npm i shorthand", () => {
		const content = "npm i lodash";
		const result = extractPackages(content);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("lodash");
	});

	it("extracts npx commands", () => {
		const content = "npx create-react-app my-app";
		const result = extractPackages(content);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("create-react-app");
	});

	it("extracts scoped packages", () => {
		const content = "npm install @angular/core";
		const result = extractPackages(content);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("@angular/core");
	});

	it("strips version suffixes", () => {
		const content = "npm install express@4.18.0";
		const result = extractPackages(content);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("express");
	});

	it("strips version from scoped packages", () => {
		const content = "npm install @types/node@22";
		const result = extractPackages(content);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("@types/node");
	});

	it("handles flags between command and package", () => {
		const content = "npm install --save-dev typescript";
		const result = extractPackages(content);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("typescript");
	});

	it("extracts pnpm add", () => {
		const content = "pnpm add zod";
		const result = extractPackages(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ name: "zod", ecosystem: "npm" });
	});

	it("extracts yarn add", () => {
		const content = "yarn add react";
		const result = extractPackages(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ name: "react", ecosystem: "npm" });
	});

	it("extracts bunx", () => {
		const content = "bunx prisma migrate";
		const result = extractPackages(content);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("prisma");
	});

	it("extracts pip install", () => {
		const content = "pip install requests";
		const result = extractPackages(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			name: "requests",
			ecosystem: "pypi",
		});
	});

	it("extracts pip3 install", () => {
		const content = "pip3 install flask";
		const result = extractPackages(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ name: "flask", ecosystem: "pypi" });
	});

	it("strips pip version pinning", () => {
		const content = "pip install django==4.2.0";
		const result = extractPackages(content);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("django");
	});

	it("extracts cargo add", () => {
		const content = "cargo add serde";
		const result = extractPackages(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ name: "serde", ecosystem: "crates" });
	});

	it("extracts cargo install", () => {
		const content = "cargo install ripgrep";
		const result = extractPackages(content);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ name: "ripgrep", ecosystem: "crates" });
	});

	it("tracks correct line numbers", () => {
		const content = "line 1\nline 2\nnpm install foo\nline 4\npip install bar";
		const result = extractPackages(content);
		expect(result).toHaveLength(2);
		expect(result[0].line).toBe(3);
		expect(result[1].line).toBe(5);
	});

	it("returns empty for no packages", () => {
		const content = "This is just text with no package references.";
		expect(extractPackages(content)).toHaveLength(0);
	});
});
