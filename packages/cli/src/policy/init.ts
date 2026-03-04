/**
 * Generate a starter .skill-policy.yml file with commented examples.
 */
export function generateStarterPolicy(): string {
	return `# .skill-policy.yml — skills-check policy enforcement
# See: https://skillscheck.ai/docs/policy
version: 1

# Trusted sources — only skills from these sources are allowed
# If allow is specified, everything not in allow is implicitly denied
sources:
  allow:
    # - "our-org/*"              # Any repo in your GitHub org
    # - "anthropics/skills"      # Official Anthropic skills
    # - "vercel-labs/agent-skills"  # Official Vercel skills
    # - "npm:@our-org/*"         # Any npm package in your scope
  deny: []
    # - "untrusted-user/*"       # Block a specific source

# Required skills — these must be installed in every project
required: []
  # - skill: "coding-standards"
  #   source: "our-org/engineering-skills"
  # - skill: "security-review"
  #   source: "our-org/engineering-skills"

# Banned skills — these must NOT be installed
banned: []
  # - skill: "deploy-to-prod-yolo"
  #   reason: "Bypasses deployment safety checks"

# Metadata requirements — skills must have these fields
metadata:
  required_fields:
    - name
    - description
  require_license: false
  allowed_licenses: []
    # - MIT
    # - Apache-2.0
    # - BSD-2-Clause
    # - BSD-3-Clause

# Content rules
content:
  deny_patterns: []
    # - pattern: "curl.*\\\\|.*bash"
    #   reason: "Piping remote scripts to bash is prohibited"
    # - pattern: "chmod\\\\s+777"
    #   reason: "World-writable permissions are prohibited"
  require_patterns: []
    # - pattern: "## Error Handling"
    #   reason: "All skills must document error handling"

# Staleness policy
freshness:
  max_age_days: 90
  # max_version_drift: minor
  require_product_version: false

# Audit integration
audit:
  require_clean: false
  min_severity_to_block: high
`;
}
