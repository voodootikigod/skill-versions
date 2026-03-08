import Image from "next/image";
import Link from "next/link";
import styles from "./footer.module.css";

export function Footer() {
	return (
		<footer className={styles.footer}>
			<div className={styles.container}>
				<div className={styles.left}>
					<span className={styles.brand}>skills-check</span>
					<span className={styles.separator}>|</span>
					<a
						href="https://github.com/voodootikigod/skills-check"
						rel="noopener noreferrer"
						target="_blank"
					>
						skills-check source on GitHub
					</a>
					<Link href="/docs">CLI documentation and reference</Link>
					<Link href="/schema.json">Registry JSON Schema</Link>
				</div>
				<div className={styles.right}>
					<a
						href="https://github.com/marketplace/actions/skills-check-ci"
						rel="noopener noreferrer"
						target="_blank"
					>
						skills-check GitHub Action
					</a>
					<a
						href="https://npmjs.com/package/skills-check"
						rel="noopener noreferrer"
						target="_blank"
					>
						skills-check on npm
					</a>
				</div>
			</div>
			<div className={styles.author}>
				<span className={styles.authorText}>Made with love from</span>
				<a
					className={styles.authorLink}
					href="https://github.com/voodootikigod"
					rel="noopener noreferrer"
					target="_blank"
				>
					<Image
						alt="@voodootikigod"
						className={styles.avatar}
						height={20}
						src="/voodootikigod.webp"
						width={20}
					/>
					@voodootikigod
				</a>
			</div>
		</footer>
	);
}
