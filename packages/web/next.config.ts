import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// biome-ignore lint/suspicious/useAwait: Next.js headers() API requires async signature
	async headers() {
		return [
			{
				source: "/schema.json",
				headers: [
					{
						key: "Content-Type",
						value: "application/schema+json",
					},
					{
						key: "Access-Control-Allow-Origin",
						value: "*",
					},
					{
						key: "Cache-Control",
						value: "public, max-age=3600, s-maxage=86400",
					},
				],
			},
		];
	},
};

export default nextConfig;
