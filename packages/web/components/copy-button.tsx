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
			aria-label="Copy to clipboard"
			className={styles.button}
			onClick={handleCopy}
			type="button"
		>
			{copied ? (
				<svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
					<path
						d="M13.5 4.5L6 12L2.5 8.5"
						stroke="var(--success)"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="1.5"
					/>
				</svg>
			) : (
				<svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
					<rect
						height="9"
						rx="1.5"
						stroke="var(--text-secondary)"
						strokeWidth="1.5"
						width="9"
						x="5"
						y="5"
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
