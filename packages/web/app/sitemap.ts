import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: "https://skillsafe.sh",
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1,
		},
		{
			url: "https://skillsafe.sh/docs",
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.8,
		},
		{
			url: "https://skillsafe.sh/schema.json",
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.5,
		},
	];
}
