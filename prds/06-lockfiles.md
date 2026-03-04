# Skill Lockfiles

> **Owner:** 📦 skills.sh / npx skills (propose to maintainer)
> **Priority:** 🟡 Quadrant 2 — Lower Novelty, High Impact
> **Novelty:** ★★☆☆☆ | **Impact:** ★★★★★

## Summary

A `skills.lock` file that pins the exact version (git commit SHA or npm version) of every installed skill, ensuring deterministic installation across team members, CI environments, and deployments. This is `package-lock.json` / `Cargo.lock` / `poetry.lock` for skills.

## Why This Matters

Without a lockfile, two developers running `npx skills add vercel-labs/agent-skills` at different times may get different skill content. Skills sourced from GitHub repos are pinned to a branch (usually `main`), not a commit. This means:

- Teammate A installed the Next.js skill on Monday (commit `abc123`)
- Teammate B installed on Friday (commit `def456`, which changed the recommended routing pattern)
- Their agents now give different advice for the same prompt
- Nobody knows this is happening

Lockfiles make this deterministic: everyone with the same `skills.lock` gets the same skill content.

## Proposed Format

```json
{
  "lockfileVersion": 1,
  "generated": "2026-03-02T10:30:00Z",
  "generatedBy": "skills@1.4.3",
  "skills": {
    "vercel-labs/agent-skills/frontend-design": {
      "source": "github",
      "repo": "vercel-labs/agent-skills",
      "skill": "frontend-design",
      "commit": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      "branch": "main",
      "installedAt": "2026-03-01T14:00:00Z",
      "contentHash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "agents": ["claude-code", "cursor"]
    },
    "anthropics/skills/pdf": {
      "source": "github",
      "repo": "anthropics/skills",
      "skill": "pdf",
      "commit": "f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5",
      "branch": "main",
      "installedAt": "2026-02-28T09:00:00Z",
      "contentHash": "sha256:d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
      "agents": ["claude-code"]
    },
    "fullstack-react": {
      "source": "npm",
      "package": "fullstack-react",
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/fullstack-react/-/fullstack-react-2.1.0.tgz",
      "integrity": "sha512-abc123...",
      "contentHash": "sha256:...",
      "agents": ["claude-code", "cursor"]
    }
  }
}
```

### Key Fields

- **source**: `github` or `npm` — where the skill was installed from
- **commit**: Exact git commit SHA (for GitHub sources)
- **version**: Exact npm version (for npm sources)
- **contentHash**: SHA-256 hash of the SKILL.md content plus all referenced files. Used to detect if installed content has been manually modified.
- **agents**: Which agent directories this skill was installed into

## CLI Behavior Changes

### Install With Lock
```bash
# If skills.lock exists, install exact versions from lock
npx skills add --frozen-lockfile

# Install and update lockfile
npx skills add vercel-labs/agent-skills  # updates skills.lock

# Install all skills from lockfile (like npm ci)
npx skills ci
```

### Update
```bash
# Update a specific skill (fetches latest, updates lock)
npx skills update frontend-design

# Update all skills (fetches latest for all, updates lock)
npx skills update

# Check if installed skills match lockfile
npx skills check-lock
```

### Integrity Verification
```bash
# Verify installed skills match lockfile hashes
npx skills verify

# Output:
# ✓ frontend-design: content matches lockfile
# ✗ pdf: content modified locally (hash mismatch)
# ✗ deploy-helper: not in lockfile (manually added?)
```

## Implementation Considerations

### Git Commit Resolution
When a skill is installed from `vercel-labs/agent-skills`, the CLI must resolve the current HEAD of the default branch to a commit SHA and record it. On subsequent `skills ci`, it checks out that exact commit.

For GitHub sources, use the GitHub API:
```
GET https://api.github.com/repos/{owner}/{repo}/commits/{branch}
```

### Content Hashing
The content hash should cover:
- SKILL.md content
- All files in the skill's `references/` directory
- All files in the skill's `templates/` directory
- The skill's frontmatter (separately from content, to detect metadata-only changes)

Use SHA-256 for consistency with npm's integrity field.

### Lockfile Conflict Resolution
When two team members install different skills and both modify `skills.lock`, git merge conflicts will occur. The lockfile format should be designed to minimize conflicts:
- One skill per entry (not nested deeply)
- Sorted alphabetically by skill name
- No trailing commas or formatting ambiguity

### Yanking Integration
If a skill version is yanked (see Deprecation & Yanking spec), `skills ci` should warn but still install from the lockfile (matching Cargo's behavior). `skills update` should skip yanked versions.

### Relationship to npm Lockfile
If skills are distributed as npm packages (skillpm model), the npm `package-lock.json` already handles version pinning for those skills. `skills.lock` would only be needed for GitHub-sourced skills. The two lockfiles should coexist without conflict.

## File Structure (skills.sh side)

```
src/
  lockfile/
    types.ts              # Lockfile schema types
    read.ts               # Parse skills.lock
    write.ts              # Generate/update skills.lock
    resolve.ts            # Resolve sources to exact versions
    verify.ts             # Content hash verification
    merge.ts              # Conflict-aware merge helper
  commands/
    ci.ts                 # Install from lockfile only
    check-lock.ts         # Verify installed matches lock
```

## skills-check Integration

skills-check can read `skills.lock` to:
- Report exact installed versions in `skills-check check` output
- Detect when a skill was updated without the lockfile being regenerated
- Use commit SHAs for precise git-based diffing in `skills-check verify`

## Success Criteria

- `skills ci` produces byte-identical skill installations across machines
- Content hash verification catches manual edits to installed skills
- Lockfile generation adds < 2 seconds to install time
- Lockfile format produces minimal git merge conflicts
- Works for both GitHub-sourced and npm-sourced skills
