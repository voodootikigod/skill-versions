import styles from "./problem.module.css";

export function Problem() {
	return (
		<section className={styles.section}>
			<div className={styles.container}>
				<h2 className={styles.heading}>The problem</h2>
				<p className={styles.lead}>
					Agent skills are treated like documentation, but they&rsquo;re really executable
					instructions. They go stale, reference packages that don&rsquo;t exist, suggest dangerous
					commands, and silently bloat your context window. Nobody notices until something breaks.
				</p>
				<div className={styles.points}>
					<div className={styles.point}>
						<span className={styles.icon}>&#x26A0;</span>
						<div>
							<h3 className={styles.pointTitle}>Silent staleness</h3>
							<p className={styles.pointDescription}>
								A renamed package, a deprecated API, a missing parameter &mdash; stale skills
								don&rsquo;t always fail loudly. Sometimes they just quietly produce worse outcomes.
							</p>
						</div>
					</div>
					<div className={styles.point}>
						<span className={styles.icon}>&#x1F6E1;</span>
						<div>
							<h3 className={styles.pointTitle}>Safety is a blindspot</h3>
							<p className={styles.pointDescription}>
								Skills can reference hallucinated packages, contain prompt injection patterns, or
								suggest commands that delete data. Without auditing, you&rsquo;re trusting unknown
								instructions.
							</p>
						</div>
					</div>
					<div className={styles.point}>
						<span className={styles.icon}>&#x1F4E6;</span>
						<div>
							<h3 className={styles.pointTitle}>
								Code has dependency management. Skills don&rsquo;t.
							</h3>
							<p className={styles.pointDescription}>
								<code>npm outdated</code> tells you when packages are behind. Dependabot opens PRs.
								But for agent knowledge? Nothing. Your skill files are flying blind.
							</p>
						</div>
					</div>
					<div className={styles.point}>
						<span className={styles.icon}>&#x2705;</span>
						<div>
							<h3 className={styles.pointTitle}>skills-check fixes this</h3>
							<p className={styles.pointDescription}>
								10 commands covering freshness, security, quality, token budgets, semver
								verification, and policy enforcement &mdash; everything you need to keep agent
								skills correct, safe, and efficient.
							</p>
						</div>
					</div>
				</div>
				<a
					className={styles.blogLink}
					href="https://www.voodootikigod.com/your-agents-knowledge-has-a-shelf-life/"
					rel="noopener noreferrer"
					target="_blank"
				>
					Read the full story: Your Agent&rsquo;s Knowledge Has a Shelf Life
					<span className={styles.arrow}>&rarr;</span>
				</a>
			</div>
		</section>
	);
}
