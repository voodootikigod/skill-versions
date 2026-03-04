import styles from "./commands.module.css";

const commandGroups = [
	{
		label: "Freshness & Currency",
		commands: [
			{
				name: "check",
				description:
					"Detect version drift by comparing skill frontmatter against the npm registry.",
				icon: "\u2713",
			},
			{
				name: "refresh",
				description:
					"AI-assisted updates to stale skills using LLMs. Fetches changelogs and generates diffs.",
				icon: "\u21BB",
			},
			{
				name: "report",
				description:
					"Generate a formatted staleness report in markdown or JSON for your team or CI.",
				icon: "\u2691",
			},
		],
	},
	{
		label: "Security & Quality",
		commands: [
			{
				name: "audit",
				description:
					"Scan for hallucinated packages, prompt injection, dangerous commands, and dead URLs.",
				icon: "\u26A1",
			},
			{
				name: "lint",
				description:
					"Validate metadata completeness, structural quality, and format in skill files.",
				icon: "\u2726",
			},
			{
				name: "policy",
				description:
					"Enforce organizational trust rules for skills via .skill-policy.yml policy-as-code.",
				icon: "\u229E",
			},
		],
	},
	{
		label: "Analysis & Verification",
		commands: [
			{
				name: "budget",
				description:
					"Measure token cost per skill, detect redundancy, and track context window usage over time.",
				icon: "\u2261",
			},
			{
				name: "verify",
				description:
					"Validate that content changes between skill versions match the declared semver bump.",
				icon: "\u2690",
			},
			{
				name: "test",
				description:
					"Run eval test suites declared in skill tests/ directories for regression detection.",
				icon: "\u25B7",
			},
		],
	},
	{
		label: "Setup",
		commands: [
			{
				name: "init",
				description:
					"Scan a skills directory for SKILL.md files and generate a skillsafe.json registry.",
				icon: "\u279C",
			},
		],
	},
];

export function Commands() {
	return (
		<section className={styles.section}>
			<div className={styles.container}>
				<h2 className={styles.heading}>10 commands, one toolkit</h2>
				<p className={styles.subtitle}>
					Everything you need to keep agent skills fresh, safe, and efficient.
				</p>
				<div className={styles.groups}>
					{commandGroups.map((group) => (
						<div className={styles.group} key={group.label}>
							<span className={styles.groupLabel}>{group.label}</span>
							<div className={styles.cards}>
								{group.commands.map((cmd) => (
									<div className={styles.card} key={cmd.name}>
										<div className={styles.cardIcon}>{cmd.icon}</div>
										<div className={styles.cardBody}>
											<div className={styles.cardName}>{cmd.name}</div>
											<div className={styles.cardDescription}>{cmd.description}</div>
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
