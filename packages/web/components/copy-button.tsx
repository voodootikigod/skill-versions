"use client";

import { useState } from "react";
import styles from "./copy-button.module.css";

export function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<button
			className={styles.button}
			onClick={handleCopy}
			aria-label="Copy to clipboard"
			type="button"
		>
			{copied ? (
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path
						d="M13.5 4.5L6 12L2.5 8.5"
						stroke="var(--success)"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			) : (
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<rect
						x="5"
						y="5"
						width="9"
						height="9"
						rx="1.5"
						stroke="var(--text-secondary)"
						strokeWidth="1.5"
					/>
					<path
						d="M11 5V3.5C11 2.67157 10.3284 2 9.5 2H3.5C2.67157 2 2 2.67157 2 3.5V9.5C2 10.3284 2.67157 11 3.5 11H5"
						stroke="var(--text-secondary)"
						strokeWidth="1.5"
					/>
				</svg>
			)}
		</button>
	);
}
