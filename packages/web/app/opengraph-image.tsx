import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "skill-versions — Freshness checker for Agent Skills";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
	return new ImageResponse(
		(
			<div
				style={{
					background: "#0a0a0a",
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: "monospace",
				}}
			>
				<div
					style={{
						fontSize: 72,
						fontWeight: 700,
						color: "#ffffff",
						letterSpacing: "-0.03em",
						display: "flex",
						textShadow:
							"0 0 7px rgba(80,227,194,0.7), 0 0 20px rgba(80,227,194,0.4), 0 0 40px rgba(80,227,194,0.2), 0 0 80px rgba(80,227,194,0.1)",
					}}
				>
					skill-versions
				</div>
				<div
					style={{
						fontSize: 28,
						color: "#888888",
						marginTop: 24,
						display: "flex",
					}}
				>
					Freshness checker for Agent Skills
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 12,
						marginTop: 40,
						background: "#0d0d0d",
						border: "1px solid #222222",
						borderRadius: 8,
						padding: "12px 20px",
					}}
				>
					<div style={{ fontSize: 20, color: "#50e3c2", display: "flex" }}>
						npx skill-versions check
					</div>
				</div>
			</div>
		),
		{ ...size },
	);
}
