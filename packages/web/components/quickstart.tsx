import { CopyButton } from "./copy-button";
import styles from "./quickstart.module.css";

const steps = [
	{
		number: "1",
		title: "Initialize your registry",
		description: "Discover SKILL.md files and map them to npm packages.",
		command: "npx skillsafe init",
	},
	{
		number: "2",
		title: "Check freshness and audit safety",
		description: "Detect version drift and scan for security issues in one pass.",
		command: "npx skillsafe check && npx skillsafe audit",
	},
	{
		number: "3",
		title: "Lint, budget, and verify",
		description: "Validate metadata, measure token costs, and confirm version bumps are honest.",
		command: "npx skillsafe lint && npx skillsafe budget && npx skillsafe verify",
	},
	{
		number: "4",
		title: "Enforce policy and test",
		description: "Apply organizational trust rules and run eval test suites.",
		command: "npx skillsafe policy check && npx skillsafe test",
	},
	{
		number: "5",
		title: "Refresh stale skills",
		description: "Use an LLM to propose targeted updates and generate a report.",
		command: "npx skillsafe refresh && npx skillsafe report",
	},
];

export function Quickstart() {
	return (
		<section className={styles.section}>
			<div className={styles.container}>
				<h2 className={styles.heading}>Quickstart</h2>
				<p className={styles.subtitle}>
					Five steps to keep your agent skills fresh, safe, and efficient.
				</p>
				<div className={styles.steps}>
					{steps.map((step) => (
						<div className={styles.step} key={step.number}>
							<div className={styles.stepNumber}>{step.number}</div>
							<div className={styles.stepContent}>
								<h3 className={styles.stepTitle}>{step.title}</h3>
								<p className={styles.stepDescription}>{step.description}</p>
								<div className={styles.codeBlock}>
									<code>{step.command}</code>
									<CopyButton text={step.command} />
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
