#!/usr/bin/env bash
# Creates a deployment status for the deployment that triggered the workflow.
# Called from action.yml, which maps the action inputs to INPUT_* variables.
set -euo pipefail

if [[ -z "${DEPLOYMENT_ID:-}" ]]; then
  echo "::error::No deployment to update. Run this action on a \"deployment\" event or pass deployment-id (this run was triggered by \"${GITHUB_EVENT_NAME:-unknown}\")."
  exit 1
fi

if ! command -v gh >/dev/null; then
  echo "::error::The GitHub CLI (gh) is not installed on this runner. Install it before using this action."
  exit 1
fi

# Lets gh talk to GitHub Enterprise Server as well as github.com.
export GH_HOST="${GITHUB_SERVER_URL#*://}"

log_url="${INPUT_LOG_URL:-$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/commit/$GITHUB_SHA/checks}"

args=(
  --method POST
  "repos/$GITHUB_REPOSITORY/deployments/$DEPLOYMENT_ID/statuses"
  -f "state=${INPUT_STATE:-pending}"
  -f "log_url=$log_url"
  -f "target_url=$log_url"
  -f "description=${INPUT_DESCRIPTION:-}"
)
if [[ -n "${INPUT_ENVIRONMENT:-}" ]]; then
  args+=(-f "environment=$INPUT_ENVIRONMENT")
fi
if [[ -n "${INPUT_ENVIRONMENT_URL:-}" ]]; then
  args+=(-f "environment_url=$INPUT_ENVIRONMENT_URL")
fi

gh api "${args[@]}" --silent
