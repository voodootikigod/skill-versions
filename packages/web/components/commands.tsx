import Link from "next/link";
import { commands as allCommands } from "@/lib/commands";
import styles from "./commands.module.css";

const groupOrder = [
	"Freshness & Currency",
	"Security & Quality",
	"Analysis & Verification",
	"Setup",
];

const commandGroups = groupOrder.map((label) => ({
	label,
	commands: allCommands
		.filter((c) => c.group === label)
		.map((c) => ({ name: c.name, description: c.tagline, icon: c.icon, slug: c.slug })),
}));

export function Commands() {
	return (
		<section className={styles.section} id="commands">
			<div className={styles.container}>
				<h2 className={styles.heading}>12 commands, one toolkit</h2>
				<p className={styles.subtitle}>
					Everything you need to keep agent skills fresh, safe, and efficient.
				</p>
				<div className={styles.groups}>
					{commandGroups.map((group) => (
						<div className={styles.group} key={group.label}>
							<span className={styles.groupLabel}>{group.label}</span>
							<div className={styles.cards}>
								{group.commands.map((cmd) => (
									<Link className={styles.card} href={`/commands/${cmd.slug}`} key={cmd.name}>
										<div className={styles.cardIcon}>{cmd.icon}</div>
										<div className={styles.cardBody}>
											<div className={styles.cardName}>{cmd.name}</div>
											<div className={styles.cardDescription}>{cmd.description}</div>
										</div>
									</Link>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
