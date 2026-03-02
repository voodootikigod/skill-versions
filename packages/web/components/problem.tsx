import styles from "./problem.module.css";

export function Problem() {
	return (
		<section className={styles.section}>
			<div className={styles.container}>
				<h2 className={styles.heading}>The problem</h2>
				<p className={styles.lead}>
					Agent skills are snapshots of knowledge at a point in time.
					They don&rsquo;t update themselves. They don&rsquo;t know when
					upstream products ship breaking changes. They just sit there,
					slowly becoming wrong.
				</p>
				<div className={styles.points}>
					<div className={styles.point}>
						<span className={styles.icon}>&#x26A0;</span>
						<div>
							<h3 className={styles.pointTitle}>Silent staleness</h3>
							<p className={styles.pointDescription}>
								A renamed package, a deprecated API, a missing parameter
								&mdash; stale skills don&rsquo;t always fail loudly.
								Sometimes they just quietly produce worse outcomes.
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
								<code>npm outdated</code> tells you when packages are
								behind. Dependabot opens PRs. But for agent knowledge?
								Nothing. Your skill files are flying blind.
							</p>
						</div>
					</div>
					<div className={styles.point}>
						<span className={styles.icon}>&#x2705;</span>
						<div>
							<h3 className={styles.pointTitle}>
								skill-versions fixes this
							</h3>
							<p className={styles.pointDescription}>
								A product registry, version checker, frontmatter convention,
								and AI-assisted refresh &mdash; everything you need to keep
								agent skills current, automatically.
							</p>
						</div>
					</div>
				</div>
				<a
					href="https://www.voodootikigod.com/your-agents-knowledge-has-a-shelf-life/"
					target="_blank"
					rel="noopener noreferrer"
					className={styles.blogLink}
				>
					Read the full story: Your Agent&rsquo;s Knowledge Has a Shelf Life
					<span className={styles.arrow}>&rarr;</span>
				</a>
			</div>
		</section>
	);
}
