import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { commandSlugs, getCommandBySlug } from "@/lib/commands";
import styles from "./command.module.css";

interface Props {
	params: Promise<{ slug: string }>;
}

// biome-ignore lint/suspicious/useAwait: Next.js requires async for generateStaticParams
export async function generateStaticParams() {
	return commandSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const cmd = getCommandBySlug(slug);
	if (!cmd) {
		return {};
	}

	return {
		title: `${cmd.name} command`,
		description: cmd.description,
		alternates: {
			canonical: `https://skillscheck.ai/commands/${slug}`,
		},
	};
}

export default async function CommandPage({ params }: Props) {
	const { slug } = await params;
	const cmd = getCommandBySlug(slug);
	if (!cmd) {
		notFound();
	}

	const techArticleJsonLd = {
		"@context": "https://schema.org",
		"@type": "TechArticle",
		headline: `skills-check ${cmd.name} command`,
		description: cmd.description,
		url: `https://skillscheck.ai/commands/${slug}`,
		author: { "@type": "Person", name: "Chris Williams" },
	};

	const breadcrumbJsonLd = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: [
			{
				"@type": "ListItem",
				position: 1,
				name: "Home",
				item: "https://skillscheck.ai",
			},
			{
				"@type": "ListItem",
				position: 2,
				name: "Commands",
				item: "https://skillscheck.ai/#commands",
			},
			{
				"@type": "ListItem",
				position: 3,
				name: cmd.name,
				item: `https://skillscheck.ai/commands/${slug}`,
			},
		],
	};

	return (
		<>
			<script
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data requires innerHTML
				dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleJsonLd) }}
				type="application/ld+json"
			/>
			<script
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data requires innerHTML
				dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
				type="application/ld+json"
			/>
			<Header />
			<main className={styles.main}>
				<article className={styles.article}>
					<Link className={styles.backLink} href="/#commands">
						&larr; Browse all 10 skills-check commands
					</Link>

					<div className={styles.header}>
						<span className={styles.icon}>{cmd.icon}</span>
						<div>
							<span className={styles.group}>{cmd.group}</span>
							<h1 className={styles.title}>{cmd.name}</h1>
						</div>
					</div>

					<p className={styles.tagline}>{cmd.description}</p>

					<section>
						<h2>Why it matters</h2>
						<p>{cmd.whyItMatters}</p>
					</section>

					<section>
						<h2>What it does</h2>
						<ul className={styles.list}>
							{cmd.whatItDoes.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					</section>

					<section>
						<h2>Usage</h2>
						<pre>
							<code>{cmd.usage}</code>
						</pre>

						<h3>Options</h3>
						<table>
							<thead>
								<tr>
									<th>Flag</th>
									<th>Description</th>
								</tr>
							</thead>
							<tbody>
								{cmd.options.map((opt) => (
									<tr key={opt.flag}>
										<td>
											<code>{opt.flag}</code>
										</td>
										<td>{opt.description}</td>
									</tr>
								))}
							</tbody>
						</table>
					</section>

					<section>
						<h2>Examples</h2>
						{cmd.examples.map((ex) => (
							<div key={ex.label}>
								<h3>{ex.label}</h3>
								<pre>
									<code>{ex.code}</code>
								</pre>
							</div>
						))}
					</section>

					<section>
						<h2>When to use this</h2>
						<ul className={styles.list}>
							{cmd.whenToUse.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					</section>

					<section>
						<h2>Related commands</h2>
						<ul className={styles.list}>
							{cmd.relatedCommands.map((rel) => {
								const related = getCommandBySlug(rel.slug);
								return (
									<li key={rel.slug}>
										<Link href={`/commands/${rel.slug}`}>{related ? related.name : rel.slug}</Link>
										{" \u2014 "}
										{rel.relationship}
									</li>
								);
							})}
						</ul>
					</section>

					{cmd.commonFindings && cmd.commonFindings.length > 0 && (
						<section>
							<h2>Common findings</h2>
							<ul className={styles.list}>
								{cmd.commonFindings.map((finding) => (
									<li key={finding}>{finding}</li>
								))}
							</ul>
						</section>
					)}

					{cmd.ciTip && (
						<section className={styles.ciTip}>
							<h2>CI tip</h2>
							<p>{cmd.ciTip}</p>
						</section>
					)}

					<div className={styles.navLinks}>
						<Link href="/docs#commands">See complete CLI reference in docs &rarr;</Link>
					</div>
				</article>
			</main>
			<Footer />
		</>
	);
}
