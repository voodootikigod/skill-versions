import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import styles from "./concepts.module.css";

export const metadata: Metadata = {
	title: "Concepts & Glossary",
	description:
		"Key terms and concepts in the Agent Skills ecosystem: SKILL.md format, product-version drift, hallucinated packages, token budgets, semver verification, policy enforcement, and more.",
	alternates: {
		canonical: "https://skillscheck.ai/concepts",
	},
};

const jsonLd = {
	"@context": "https://schema.org",
	"@type": "DefinedTermSet",
	name: "Agent Skills Glossary",
	description: "Key terms and concepts in the Agent Skills ecosystem",
	definedTerm: [
		{
			"@type": "DefinedTerm",
			name: "Agent Skill",
			description:
				"A markdown document (SKILL.md) with YAML frontmatter that instructs AI coding agents how to work with specific products, frameworks, and patterns. Unlike regular documentation, skills are loaded into LLM context windows and treated as executable instructions.",
		},
		{
			"@type": "DefinedTerm",
			name: "SKILL.md",
			description:
				"The standard file format for agent skills. Contains YAML frontmatter (name, description, version, product-version) followed by a markdown body with instructions, code examples, and patterns.",
		},
		{
			"@type": "DefinedTerm",
			name: "Product-version drift",
			description:
				"When a skill's product-version frontmatter references an outdated version of the product it covers. For example, a React skill referencing v18 when v19 is current.",
		},
		{
			"@type": "DefinedTerm",
			name: "Skill staleness",
			description:
				"A skill that hasn't been updated relative to product releases, potentially containing outdated APIs, deprecated patterns, or removed features.",
		},
		{
			"@type": "DefinedTerm",
			name: "Hallucinated packages",
			description:
				"Package names referenced in skills that don't exist on package registries (npm, PyPI, crates.io). These can be exploited via dependency confusion attacks.",
		},
		{
			"@type": "DefinedTerm",
			name: "Prompt injection in skills",
			description:
				"Malicious instructions embedded in skill content designed to override the agent's system prompt, exfiltrate data, or execute unauthorized commands.",
		},
		{
			"@type": "DefinedTerm",
			name: "Dangerous commands",
			description:
				"Destructive shell commands (rm -rf, chmod 777, curl | sh) that skills should not recommend, as agents may execute them with full system access.",
		},
		{
			"@type": "DefinedTerm",
			name: "Token budget",
			description:
				"The context window cost of loading a skill, measured in tokens. Skills compete for limited context space; oversized skills reduce room for user code and conversation.",
		},
		{
			"@type": "DefinedTerm",
			name: "Semver verification",
			description:
				"Validating that content changes between skill versions match the declared semantic version bump. A typo fix shouldn't be a major version bump; a new API section shouldn't be a patch.",
		},
		{
			"@type": "DefinedTerm",
			name: "Policy enforcement",
			description:
				"Organizational rules applied to skill collections via .skill-policy.yml. Policies can require trusted sources, ban patterns, mandate metadata, set staleness limits.",
		},
		{
			"@type": "DefinedTerm",
			name: "Skill registry",
			description:
				"The skills-check.json file that maps product names to npm packages, tracks verified versions, and lists associated skill files.",
		},
		{
			"@type": "DefinedTerm",
			name: "skills.sh",
			description:
				"The primary CLI and registry for installing and distributing agent skills (npx skills add). Handles discovery, installation, and lifecycle management.",
		},
		{
			"@type": "DefinedTerm",
			name: "Agent harness",
			description:
				"The AI coding tool (Claude Code, Cursor, Codex, Windsurf) that loads skills into its LLM context window and executes them as part of its instruction set.",
		},
		{
			"@type": "DefinedTerm",
			name: "Context window",
			description:
				"The LLM's working memory where skills, user code, conversation history, and system prompts compete for space. Typically 100K-200K tokens.",
		},
	],
};

export default function ConceptsPage() {
	return (
		<>
			<script
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data requires innerHTML
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				type="application/ld+json"
			/>
			<Header />
			<main className={styles.main}>
				<article className={styles.article}>
					<h1>Concepts & Glossary</h1>
					<p className={styles.intro}>
						Key terms and concepts in the Agent Skills ecosystem. Understanding these definitions
						helps when working with <code>skills-check</code> commands and the broader skill
						toolchain.
					</p>

					{/* Core Concepts */}
					<section className={styles.category}>
						<h2 className={styles.categoryTitle} id="core">
							Core Concepts
						</h2>

						<div className={styles.term} id="agent-skill">
							<h3 className={styles.termName}>Agent Skill</h3>
							<p className={styles.termDef}>
								A markdown document (<code>SKILL.md</code>) with YAML frontmatter that instructs AI
								coding agents how to work with specific products, frameworks, and patterns. Unlike
								regular documentation, skills are loaded into LLM context windows and treated as
								executable instructions. Because agents can access the file system and run shell
								commands, skill quality is a security and correctness concern — not just a
								readability one.
							</p>
						</div>

						<div className={styles.term} id="skill-md">
							<h3 className={styles.termName}>
								<code>SKILL.md</code>
							</h3>
							<p className={styles.termDef}>
								The standard file format for agent skills. Contains YAML frontmatter (
								<code>name</code>, <code>description</code>, <code>version</code>,{" "}
								<code>product-version</code>) followed by a markdown body with instructions, code
								examples, and patterns. Validated by the <Link href="/commands/lint">lint</Link>{" "}
								command.
							</p>
						</div>

						<div className={styles.term} id="product-version-drift">
							<h3 className={styles.termName}>Product-version drift</h3>
							<p className={styles.termDef}>
								When a skill&apos;s <code>product-version</code> frontmatter references an outdated
								version of the product it covers. For example, a React skill referencing v18 when
								v19 is current. Detected by the <Link href="/commands/check">check</Link> command
								and resolvable via <Link href="/commands/refresh">refresh</Link>.
							</p>
						</div>

						<div className={styles.term} id="skill-staleness">
							<h3 className={styles.termName}>Skill staleness</h3>
							<p className={styles.termDef}>
								A skill that hasn&apos;t been updated relative to product releases, potentially
								containing outdated APIs, deprecated patterns, or removed features. Staleness is a
								spectrum — a one-patch lag may be acceptable, while a major version behind is
								urgent. The <Link href="/commands/policy">policy</Link> command can enforce
								staleness limits.
							</p>
						</div>
					</section>

					{/* Security Concepts */}
					<section className={styles.category}>
						<h2 className={styles.categoryTitle} id="security">
							Security Concepts
						</h2>

						<div className={styles.term} id="hallucinated-packages">
							<h3 className={styles.termName}>Hallucinated packages</h3>
							<p className={styles.termDef}>
								Package names referenced in skills that don&apos;t exist on package registries (npm,
								PyPI, crates.io). When an LLM generates a skill, it may invent plausible package
								names that a malicious actor could register, enabling dependency confusion attacks.
								Detected by the <Link href="/commands/audit">audit</Link> command&apos;s registry
								checker.
							</p>
						</div>

						<div className={styles.term} id="prompt-injection">
							<h3 className={styles.termName}>Prompt injection in skills</h3>
							<p className={styles.termDef}>
								Malicious instructions embedded in skill content designed to override the
								agent&apos;s system prompt, exfiltrate data, or execute unauthorized commands.
								Because skills are loaded directly into the LLM context, they have a privileged
								position to influence agent behavior. Scanned by the{" "}
								<Link href="/commands/audit">audit</Link> command.
							</p>
						</div>

						<div className={styles.term} id="dangerous-commands">
							<h3 className={styles.termName}>Dangerous commands</h3>
							<p className={styles.termDef}>
								Destructive shell commands (<code>rm -rf</code>, <code>chmod 777</code>,{" "}
								<code>curl | sh</code>) that skills should not recommend, as agents may execute them
								with full system access. The <Link href="/commands/audit">audit</Link> command flags
								these patterns, and the <Link href="/commands/policy">policy</Link> command can ban
								them organization-wide.
							</p>
						</div>
					</section>

					{/* Quality Concepts */}
					<section className={styles.category}>
						<h2 className={styles.categoryTitle} id="quality">
							Quality Concepts
						</h2>

						<div className={styles.term} id="token-budget">
							<h3 className={styles.termName}>Token budget</h3>
							<p className={styles.termDef}>
								The context window cost of loading a skill, measured in tokens. Skills compete for
								limited context space; oversized skills reduce room for user code and conversation.
								The <Link href="/commands/budget">budget</Link> command measures per-skill and
								per-section token counts, detects redundancy between skills, and tracks costs over
								time.
							</p>
						</div>

						<div className={styles.term} id="semver-verification">
							<h3 className={styles.termName}>Semver verification</h3>
							<p className={styles.termDef}>
								Validating that content changes between skill versions match the declared semantic
								version bump. A typo fix shouldn&apos;t be a major version bump; a new API section
								shouldn&apos;t be a patch. The <Link href="/commands/verify">verify</Link> command
								uses heuristic rules and optionally LLM-assisted analysis to detect mismatches.
							</p>
						</div>

						<div className={styles.term} id="policy-enforcement">
							<h3 className={styles.termName}>Policy enforcement</h3>
							<p className={styles.termDef}>
								Organizational rules applied to skill collections via <code>.skill-policy.yml</code>
								. Policies can require trusted sources, ban patterns, mandate metadata, and set
								staleness limits. Enforced by the <Link href="/commands/policy">policy</Link>{" "}
								command and integrable into CI pipelines.
							</p>
						</div>

						<div className={styles.term} id="skill-registry">
							<h3 className={styles.termName}>Skill registry</h3>
							<p className={styles.termDef}>
								The <code>skills-check.json</code> file that maps product names to npm packages,
								tracks verified versions, and lists associated skill files. Created by{" "}
								<Link href="/commands/init">init</Link> and consumed by{" "}
								<Link href="/commands/check">check</Link>,{" "}
								<Link href="/commands/report">report</Link>, and{" "}
								<Link href="/commands/refresh">refresh</Link>.
							</p>
						</div>
					</section>

					{/* Ecosystem */}
					<section className={styles.category}>
						<h2 className={styles.categoryTitle} id="ecosystem">
							Ecosystem
						</h2>

						<div className={styles.term} id="skills-sh">
							<h3 className={styles.termName}>skills.sh</h3>
							<p className={styles.termDef}>
								The primary CLI and registry for installing and distributing agent skills (
								<code>npx skills add</code>). Handles discovery, installation, and lifecycle
								management. skills-check complements skills.sh as the verification layer — skills.sh
								installs skills, skills-check keeps them safe.
							</p>
						</div>

						<div className={styles.term} id="agent-harness">
							<h3 className={styles.termName}>Agent harness</h3>
							<p className={styles.termDef}>
								The AI coding tool (Claude Code, Cursor, Codex, Windsurf) that loads skills into its
								LLM context window and executes them as part of its instruction set. The{" "}
								<Link href="/commands/test">test</Link> command runs eval suites through
								configurable agent harnesses to verify skill behavior.
							</p>
						</div>

						<div className={styles.term} id="context-window">
							<h3 className={styles.termName}>Context window</h3>
							<p className={styles.termDef}>
								The LLM&apos;s working memory where skills, user code, conversation history, and
								system prompts compete for space. Typically 100K-200K tokens. The{" "}
								<Link href="/commands/budget">budget</Link> command helps teams understand and
								optimize how much of this space their skills consume.
							</p>
						</div>
					</section>
				</article>
			</main>
			<Footer />
		</>
	);
}
