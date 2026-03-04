import { CopyButton } from "./copy-button";
import styles from "./hero.module.css";

export function Hero() {
	return (
		<section className={styles.hero}>
			<h1 className={styles.title}>
				<span className={styles.glow}>skill</span>
				<span className={styles.glow}>safe</span>
			</h1>
			<p className={styles.tagline}>
				Quality & integrity layer for Agent Skills
				<br />
				<span className={styles.dim}>
					Freshness, security, quality, and efficiency &mdash; 10 commands, one toolkit
				</span>
			</p>
			<div className={styles.install}>
				<code className={styles.command}>npx skillsafe check</code>
				<CopyButton text="npx skillsafe check" />
			</div>
		</section>
	);
}
