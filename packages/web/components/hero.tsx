import styles from "./hero.module.css";
import { CopyButton } from "./copy-button";

const ASCII_ART = `
███████╗██╗  ██╗██╗██╗     ██╗
██╔════╝██║ ██╔╝██║██║     ██║
███████╗█████╔╝ ██║██║     ██║
╚════██║██╔═██╗ ██║██║     ██║
███████║██║  ██╗██║███████╗███████╗
╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝
██╗   ██╗███████╗██████╗ ███████╗██╗ ██████╗ ███╗   ██╗███████╗
██║   ██║██╔════╝██╔══██╗██╔════╝██║██╔═══██╗████╗  ██║██╔════╝
██║   ██║█████╗  ██████╔╝███████╗██║██║   ██║██╔██╗ ██║███████╗
╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██║██║   ██║██║╚██╗██║╚════██║
 ╚████╔╝ ███████╗██║  ██║███████║██║╚██████╔╝██║ ╚████║███████║
  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝`.trim();

export function Hero() {
	return (
		<section className={styles.hero}>
			<pre className={styles.ascii} aria-label="SKILL VERSIONS">
				{ASCII_ART}
			</pre>
			<p className={styles.tagline}>
				Freshness checker for Agent Skills
				<br />
				<span className={styles.dim}>
					Like <code>npm outdated</code> for skill knowledge
				</span>
			</p>
			<div className={styles.install}>
				<code className={styles.command}>npx skill-versions check</code>
				<CopyButton text="npx skill-versions check" />
			</div>
		</section>
	);
}
