import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "skill-versions — Freshness checker for Agent Skills",
		template: "%s | skill-versions",
	},
	description:
		"Keep AI agent skills in sync with the npm packages they describe. Scan SKILL.md files, detect stale product-versions, and generate staleness reports — like npm outdated for skill knowledge.",
	metadataBase: new URL("https://skill-versions.dev"),
	keywords: [
		"agent skills",
		"skill versions",
		"AI agents",
		"npm outdated",
		"freshness checker",
		"SKILL.md",
		"version check",
		"CLI tool",
	],
	authors: [{ name: "Chris Williams", url: "https://github.com/voodootikigod" }],
	creator: "Chris Williams",
	openGraph: {
		title: "skill-versions — Freshness checker for Agent Skills",
		description:
			"Keep AI agent skills in sync with the npm packages they describe. Like npm outdated for skill knowledge.",
		url: "https://skill-versions.dev",
		siteName: "skill-versions",
		locale: "en_US",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "skill-versions — Freshness checker for Agent Skills",
		description:
			"Keep AI agent skills in sync with the npm packages they describe. Like npm outdated for skill knowledge.",
		creator: "@voodootikigod",
	},
	robots: {
		index: true,
		follow: true,
	},
	alternates: {
		canonical: "https://skill-versions.dev",
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
			<body style={{ fontFamily: "var(--font-sans)" }}>{children}</body>
		</html>
	);
}
