"use client";

import styles from "./header.module.css";

export function Header() {
	return (
		<header className={styles.header}>
			<nav className={styles.nav}>
				<a href="/" className={styles.logo}>
					skill-versions
				</a>
				<div className={styles.links}>
					<a href="/docs">Docs</a>
					<a
						href="https://github.com/vercel/skill-versions"
						target="_blank"
						rel="noopener noreferrer"
					>
						GitHub
					</a>
				</div>
			</nav>
		</header>
	);
}
