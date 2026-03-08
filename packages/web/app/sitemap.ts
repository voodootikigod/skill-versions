import type { MetadataRoute } from "next";
import { commandSlugs } from "@/lib/commands";

export default function sitemap(): MetadataRoute.Sitemap {
	const commandPages = commandSlugs.map((slug) => ({
		url: `https://skillscheck.ai/commands/${slug}`,
		lastModified: new Date(),
		changeFrequency: "weekly" as const,
		priority: 0.7,
	}));

	return [
		{
			url: "https://skillscheck.ai",
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1,
		},
		{
			url: "https://skillscheck.ai/docs",
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.8,
		},
		...commandPages,
		{
			url: "https://skillscheck.ai/schema.json",
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.5,
		},
		{
			url: "https://skillscheck.ai/llms.txt",
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.5,
		},
		{
			url: "https://skillscheck.ai/llms-full.txt",
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.5,
		},
	];
}
