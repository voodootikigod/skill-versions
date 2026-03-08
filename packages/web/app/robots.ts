import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
			},
			{
				userAgent: "GPTBot",
				allow: "/",
			},
			{
				userAgent: "ChatGPT-User",
				allow: "/",
			},
			{
				userAgent: "Claude-Web",
				allow: "/",
			},
			{
				userAgent: "PerplexityBot",
				allow: "/",
			},
			{
				userAgent: "Applebot-Extended",
				allow: "/",
			},
			{
				userAgent: "Google-Extended",
				allow: "/",
			},
			{
				userAgent: "Amazonbot",
				allow: "/",
			},
			{
				userAgent: "anthropic-ai",
				allow: "/",
			},
			{
				userAgent: "cohere-ai",
				allow: "/",
			},
		],
		sitemap: "https://skillscheck.ai/sitemap.xml",
	};
}
