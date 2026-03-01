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
	title: "skill-versions — Freshness checker for Agent Skills",
	description:
		"Like npm outdated for skill knowledge. Keep your AI agent skills in sync with the packages they describe.",
	metadataBase: new URL("https://skill-versions.dev"),
	openGraph: {
		title: "skill-versions",
		description: "Freshness checker for Agent Skills — like npm outdated for skill knowledge",
		url: "https://skill-versions.dev",
		siteName: "skill-versions",
		type: "website",
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
