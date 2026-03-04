import Link from "next/link";
import styles from "./header.module.css";

export function Header() {
	return (
		<header className={styles.header}>
			<nav className={styles.nav}>
				<Link className={styles.logo} href="/">
					skillsafe
				</Link>
				<div className={styles.links}>
					<Link href="/docs">Docs</Link>
					<a
						href="https://github.com/voodootikigod/skillsafe"
						rel="noopener noreferrer"
						target="_blank"
					>
						GitHub
					</a>
				</div>
			</nav>
		</header>
	);
}
