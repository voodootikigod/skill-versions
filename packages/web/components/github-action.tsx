import { CopyButton } from "./copy-button";
import styles from "./github-action.module.css";

const basicExample = `name: Skills Check
on:
  push:
    paths: ["**SKILL.md"]
  schedule:
    - cron: "0 9 * * 1" # weekly Monday 9am

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: voodootikigod/skills-check@v1`;

const fullExample = `- uses: voodootikigod/skills-check@v1
  with:
    commands: "check,audit,lint,budget"
    audit-fail-on: high
    budget-max-tokens: 50000`;

export function GitHubAction() {
	return (
		<section className={styles.section}>
			<div className={styles.container}>
				<div className={styles.header}>
					<div className={styles.badge}>GitHub Action</div>
					<h2 className={styles.heading}>Run in CI, catch issues before merge</h2>
					<p className={styles.subtitle}>
						Add skills-check to any GitHub Actions workflow. All 10 commands available, with
						per-command thresholds, JSON outputs, and non-zero exit codes for CI gating.
					</p>
					<a
						className={styles.marketplaceLink}
						href="https://github.com/marketplace/actions/skills-check-ci"
						rel="noopener noreferrer"
						target="_blank"
					>
						Get the skills-check GitHub Action on Marketplace &rarr;
					</a>
				</div>

				<div className={styles.examples}>
					<div className={styles.example}>
						<div className={styles.exampleHeader}>
							<span className={styles.exampleLabel}>Basic — check freshness on every push</span>
							<CopyButton text={basicExample} />
						</div>
						<pre className={styles.code}>
							<code>{basicExample}</code>
						</pre>
					</div>

					<div className={styles.example}>
						<div className={styles.exampleHeader}>
							<span className={styles.exampleLabel}>
								Multi-command — audit, lint, and budget in one step
							</span>
							<CopyButton text={fullExample} />
						</div>
						<pre className={styles.code}>
							<code>{fullExample}</code>
						</pre>
					</div>
				</div>

				<div className={styles.features}>
					<div className={styles.feature}>
						<div className={styles.featureIcon}>
							<svg aria-hidden="true" fill="none" height="20" viewBox="0 0 20 20" width="20">
								<path
									d="M16.5 5.5L8 14L3.5 9.5"
									stroke="var(--success)"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="1.5"
								/>
							</svg>
						</div>
						<div>
							<h3 className={styles.featureTitle}>All 10 commands</h3>
							<p className={styles.featureDesc}>
								check, audit, lint, budget, verify, test, policy, refresh, report, init
							</p>
						</div>
					</div>
					<div className={styles.feature}>
						<div className={styles.featureIcon}>
							<svg aria-hidden="true" fill="none" height="20" viewBox="0 0 20 20" width="20">
								<path
									d="M16.5 5.5L8 14L3.5 9.5"
									stroke="var(--success)"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="1.5"
								/>
							</svg>
						</div>
						<div>
							<h3 className={styles.featureTitle}>Configurable thresholds</h3>
							<p className={styles.featureDesc}>
								Fail on specific severity levels per command — audit-fail-on, lint-fail-on,
								budget-max-tokens
							</p>
						</div>
					</div>
					<div className={styles.feature}>
						<div className={styles.featureIcon}>
							<svg aria-hidden="true" fill="none" height="20" viewBox="0 0 20 20" width="20">
								<path
									d="M16.5 5.5L8 14L3.5 9.5"
									stroke="var(--success)"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="1.5"
								/>
							</svg>
						</div>
						<div>
							<h3 className={styles.featureTitle}>Structured outputs</h3>
							<p className={styles.featureDesc}>
								JSON results, per-command exit codes, and finding counts for downstream steps
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
