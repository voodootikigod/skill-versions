#!/usr/bin/env bash
set -euo pipefail

# upsert-issue.sh — Create or update a GitHub issue for skill staleness.
#
# Environment variables:
#   GH_TOKEN      — GitHub token with issues:write permission
#   ISSUE_LABEL   — Label used for deduplication (e.g. "skill-staleness")
#   REPORT_BODY   — Markdown body for the issue
#   GITHUB_OUTPUT — GitHub Actions output file

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${ISSUE_LABEL:?ISSUE_LABEL is required}"
: "${REPORT_BODY:?REPORT_BODY is required}"

TITLE="Skill staleness detected — $(date -u +%Y-%m-%d)"

# Search for an existing open issue with the staleness label
EXISTING=$(gh issue list \
  --label "$ISSUE_LABEL" \
  --state open \
  --limit 1 \
  --json number \
  --jq '.[0].number // empty' 2>/dev/null || true)

if [ -n "$EXISTING" ]; then
  gh issue edit "$EXISTING" \
    --title "$TITLE" \
    --body "$REPORT_BODY"
  echo "Updated existing issue #${EXISTING}"
  ISSUE_NUMBER="$EXISTING"
else
  ISSUE_NUMBER=$(gh issue create \
    --title "$TITLE" \
    --body "$REPORT_BODY" \
    --label "$ISSUE_LABEL" \
    --json number \
    --jq '.number')
  echo "Created new issue #${ISSUE_NUMBER}"
fi

echo "issue_number=${ISSUE_NUMBER}" >> "$GITHUB_OUTPUT"
