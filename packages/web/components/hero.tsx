import { CopyButton } from "./copy-button";
import styles from "./hero.module.css";

export function Hero() {
	return (
		<section className={styles.hero}>
			<h1 className={styles.title}>
				<span className={styles.glow}>skills</span>
				<span className={styles.glowDim}>-</span>
				<span className={styles.glow}>check</span>
			</h1>
			<p className={styles.tagline}>
				The missing quality toolkit for Agent Skills
				<br />
				<span className={styles.dim}>
					Freshness, security, quality, and efficiency &mdash; 12 commands, one toolkit
				</span>
			</p>
			<div className={styles.install}>
				<code className={styles.command}>npx skills-check check</code>
				<CopyButton text="npx skills-check check" />
			</div>
		</section>
	);
}
