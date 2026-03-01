import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import styles from "./docs.module.css";

export const metadata: Metadata = {
	title: "Docs",
	description:
		"CLI reference for skill-versions: init, check, and report commands. Registry format, SKILL.md frontmatter spec, and CI integration guide.",
	alternates: {
		canonical: "https://skill-versions.dev/docs",
	},
};

export default function DocsPage() {
	return (
		<>
			<Header />
			<main className={styles.main}>
				<article className={styles.article}>
					<h1>Documentation</h1>

					<section>
						<h2 id="overview">Overview</h2>
						<p>
							<code>skill-versions</code> is a freshness checker for Agent Skills. It
							compares the <code>product-version</code> in your SKILL.md frontmatter
							against the npm registry and flags stale skills.
						</p>
					</section>

					<section>
						<h2 id="install">Installation</h2>
						<p>No installation required. Run directly with npx:</p>
						<pre>
							<code>npx skill-versions check</code>
						</pre>
						<p>Or install globally:</p>
						<pre>
							<code>npm install -g skill-versions</code>
						</pre>
					</section>

					<section>
						<h2 id="commands">Commands</h2>

						<h3>
							<code>init [dir]</code>
						</h3>
						<p>
							Scan a skills directory for SKILL.md files and generate a{" "}
							<code>skill-versions.json</code> registry.
						</p>
						<pre>
							<code>
								{`# Interactive mode (prompts for package mappings)
npx skill-versions init ./skills

# Non-interactive mode (auto-detect mappings)
npx skill-versions init ./skills -y`}
							</code>
						</pre>

						<h3>
							<code>check</code>
						</h3>
						<p>Check all products against the npm registry.</p>
						<pre>
							<code>
								{`# Human-readable output
npx skill-versions check

# JSON output
npx skill-versions check --json

# CI mode (exit code 1 if stale)
npx skill-versions check --ci

# Check a single product
npx skill-versions check -p ai-sdk`}
							</code>
						</pre>

						<h3>
							<code>report</code>
						</h3>
						<p>Generate a full staleness report.</p>
						<pre>
							<code>
								{`# Markdown report
npx skill-versions report

# JSON report
npx skill-versions report --format json`}
							</code>
						</pre>
					</section>

					<section>
						<h2 id="registry">Registry Format</h2>
						<p>
							The <code>skill-versions.json</code> file follows a{" "}
							<Link href="/schema.json">JSON Schema</Link> that editors can validate
							against:
						</p>
						<pre>
							<code>
								{`{
  "$schema": "https://skill-versions.dev/schema.json",
  "version": 1,
  "products": {
    "ai-sdk": {
      "displayName": "Vercel AI SDK",
      "package": "ai",
      "verifiedVersion": "4.2.0",
      "verifiedAt": "2026-01-15T00:00:00Z",
      "skills": ["ai-sdk-core", "ai-sdk-tools"]
    }
  }
}`}
							</code>
						</pre>
					</section>

					<section>
						<h2 id="frontmatter">SKILL.md Frontmatter</h2>
						<p>
							Each SKILL.md file should include a <code>product-version</code> field
							in its YAML frontmatter:
						</p>
						<pre>
							<code>
								{`---
name: ai-sdk-core
product-version: "4.2.0"
---

# AI SDK Core

Your skill content here...`}
							</code>
						</pre>
					</section>

					<section>
						<h2 id="ci">CI Integration</h2>
						<p>
							Add a staleness check to your CI pipeline using the{" "}
							<code>--ci</code> flag:
						</p>
						<pre>
							<code>
								{`# GitHub Actions example
- name: Check skill freshness
  run: npx skill-versions check --ci`}
							</code>
						</pre>
						<p>
							This exits with code 1 if any skills are stale, failing the pipeline.
						</p>
					</section>
				</article>
			</main>
			<Footer />
		</>
	);
}
