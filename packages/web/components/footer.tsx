import Image from "next/image";
import Link from "next/link";
import styles from "./footer.module.css";

export function Footer() {
	return (
		<footer className={styles.footer}>
			<div className={styles.container}>
				<div className={styles.left}>
					<span className={styles.brand}>skillsafe</span>
					<span className={styles.separator}>|</span>
					<a
						href="https://github.com/voodootikigod/skillsafe"
						rel="noopener noreferrer"
						target="_blank"
					>
						GitHub
					</a>
					<Link href="/docs">Docs</Link>
					<Link href="/schema.json">Schema</Link>
				</div>
				<div className={styles.right}>
					<a href="https://npmjs.com/package/skillsafe" rel="noopener noreferrer" target="_blank">
						npm
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
