import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Quickstart } from "@/components/quickstart";
import { Footer } from "@/components/footer";

const jsonLd = {
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	name: "skill-versions",
	applicationCategory: "DeveloperApplication",
	operatingSystem: "Any",
	description:
		"Freshness checker for AI Agent Skills — like npm outdated for skill knowledge. Scan SKILL.md files, detect stale product-versions, and generate staleness reports.",
	url: "https://skill-versions.com",
	downloadUrl: "https://www.npmjs.com/package/skill-versions",
	softwareVersion: "0.1.0",
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
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
			<Header />
			<main>
				<Hero />
				<Quickstart />
			</main>
			<Footer />
		</>
	);
}
