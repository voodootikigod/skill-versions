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
		default: "Skillsafe — Quality & integrity layer for Agent Skills",
		template: "%s | Skillsafe",
	},
	description:
		"Quality & integrity layer for AI Agent Skills — check freshness, audit security, lint metadata, enforce policy, measure token budgets, verify semver, and run eval tests across your SKILL.md files.",
	metadataBase: new URL("https://skillsafe.sh"),
	keywords: [
		"agent skills",
		"skillsafe",
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
		title: "Skillsafe — Quality & integrity layer for Agent Skills",
		description:
			"Quality & integrity layer for AI Agent Skills. 10 commands for freshness, security, quality, and efficiency.",
		url: "https://skillsafe.sh",
		siteName: "Skillsafe",
		locale: "en_US",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Skillsafe — Quality & integrity layer for Agent Skills",
		description:
			"Quality & integrity layer for AI Agent Skills. 10 commands for freshness, security, quality, and efficiency.",
		creator: "@voodootikigod",
	},
	robots: {
		index: true,
		follow: true,
	},
	alternates: {
		canonical: "https://skillsafe.sh",
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html className={`${geistSans.variable} ${geistMono.variable}`} lang="en">
			<body style={{ fontFamily: "var(--font-sans)" }}>{children}</body>
		</html>
	);
}
