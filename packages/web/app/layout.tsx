import { Analytics } from "@vercel/analytics/next";
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
		default: "Skills Check — The missing quality toolkit for Agent Skills",
		template: "%s | Skills Check",
	},
	description:
		"Quality & integrity layer for AI Agent Skills — check freshness, audit security, lint metadata, enforce policy, measure token budgets, verify semver, and run eval tests across your SKILL.md files.",
	metadataBase: new URL("https://skillscheck.ai"),
	keywords: [
		"agent skills",
		"skills-check",
		"AI agents",
		"skill audit",
		"skill lint",
		"token budget",
		"SKILL.md",
		"version check",
		"policy enforcement",
		"CLI tool",
	],
	authors: [{ name: "Chris Williams", url: "https://github.com/voodootikigod" }],
	creator: "Chris Williams",
	openGraph: {
		title: "Skills Check — The missing quality toolkit for Agent Skills",
		description:
			"The missing quality toolkit for AI Agent Skills. 10 commands for freshness, security, quality, and efficiency.",
		url: "https://skillscheck.ai",
		siteName: "Skills Check",
		locale: "en_US",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Skills Check — The missing quality toolkit for Agent Skills",
		description:
			"The missing quality toolkit for AI Agent Skills. 10 commands for freshness, security, quality, and efficiency.",
		creator: "@voodootikigod",
	},
	robots: {
		index: true,
		follow: true,
	},
	alternates: {
		canonical: "https://skillscheck.ai",
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html className={`${geistSans.variable} ${geistMono.variable}`} lang="en">
			<head>
				<link href="/llms.txt" rel="alternate" title="LLM-optimized content" type="text/plain" />
			</head>
			<body style={{ fontFamily: "var(--font-sans)" }}>
				{children}
				<Analytics />
			</body>
		</html>
	);
}
