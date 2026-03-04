import { CopyButton } from "./copy-button";
import styles from "./quickstart.module.css";

const steps = [
	{
		number: "1",
		title: "Initialize your registry",
		description: "Discover SKILL.md files and map them to npm packages.",
		command: "npx skills-check init",
	},
	{
		number: "2",
		title: "Check freshness and audit safety",
		description: "Detect version drift and scan for security issues in one pass.",
		command: "npx skills-check check && npx skills-check audit",
	},
	{
		number: "3",
		title: "Lint, budget, and verify",
		description: "Validate metadata, measure token costs, and confirm version bumps are honest.",
		command: "npx skills-check lint && npx skills-check budget && npx skills-check verify",
	},
	{
		number: "4",
		title: "Enforce policy and test",
		description: "Apply organizational trust rules and run eval test suites.",
		command: "npx skills-check policy check && npx skills-check test",
	},
	{
		number: "5",
		title: "Refresh stale skills",
		description: "Use an LLM to propose targeted updates and generate a report.",
		command: "npx skills-check refresh && npx skills-check report",
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
