import styles from "./footer.module.css";

export function Footer() {
	return (
		<footer className={styles.footer}>
			<div className={styles.container}>
				<div className={styles.left}>
					<span className={styles.brand}>skill-versions</span>
					<span className={styles.separator}>|</span>
					<a
						href="https://github.com/vercel/skill-versions"
						target="_blank"
						rel="noopener noreferrer"
					>
						GitHub
					</a>
					<a href="/docs">Docs</a>
					<a href="/schema.json">Schema</a>
				</div>
				<div className={styles.right}>
					<a href="https://npmjs.com/package/skill-versions" target="_blank" rel="noopener noreferrer">
						npm
					</a>
				</div>
			</div>
		</footer>
	);
}
