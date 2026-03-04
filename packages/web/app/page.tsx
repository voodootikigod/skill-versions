import { Commands } from "@/components/commands";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Problem } from "@/components/problem";
import { Quickstart } from "@/components/quickstart";

const jsonLd = {
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	name: "skills-check",
	applicationCategory: "DeveloperApplication",
	operatingSystem: "Any",
	description:
		"Quality & integrity layer for AI Agent Skills — check freshness, audit security, lint metadata, enforce policy, measure token budgets, verify semver, and run eval tests across your SKILL.md files.",
	url: "https://skillscheck.ai",
	downloadUrl: "https://www.npmjs.com/package/skills-check",
	softwareVersion: "1.0.0",
	author: {
		"@type": "Person",
		name: "Chris Williams",
		url: "https://github.com/voodootikigod",
	},
	offers: {
		"@type": "Offer",
		price: "0",
		priceCurrency: "USD",
	},
};

export default function Home() {
	return (
		<>
			<script
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data requires innerHTML
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				type="application/ld+json"
			/>
			<Header />
			<main>
				<Hero />
				<Problem />
				<Commands />
				<Quickstart />
			</main>
			<Footer />
		</>
	);
}
