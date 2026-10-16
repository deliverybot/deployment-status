#!/usr/bin/env bash
# Creates a deployment status for the deployment that triggered the workflow.
# Called from main.js, which maps the action inputs to INPUT_* variables.
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
state="${INPUT_STATE:-pending}"

# GitHub marks earlier successful deployments to the environment inactive
# whenever a new status is created, unless auto_inactive is false. Only let a
# successful deployment do that, so a deployment that is still running or has
# failed doesn't replace the one that is actually live.
auto_inactive="${INPUT_AUTO_INACTIVE:-}"
if [[ -z "$auto_inactive" ]]; then
  if [[ "$state" == "success" ]]; then
    auto_inactive=true
  else
    auto_inactive=false
  fi
elif [[ "$auto_inactive" != "true" && "$auto_inactive" != "false" ]]; then
  echo "::error::auto-inactive must be \"true\" or \"false\", got \"$auto_inactive\"."
  exit 1
fi

args=(
  --method POST
  "repos/$GITHUB_REPOSITORY/deployments/$DEPLOYMENT_ID/statuses"
  -f "state=$state"
  -f "log_url=$log_url"
  -f "target_url=$log_url"
  -f "description=${INPUT_DESCRIPTION:-}"
  -F "auto_inactive=$auto_inactive"
)
if [[ -n "${INPUT_ENVIRONMENT:-}" ]]; then
  args+=(-f "environment=$INPUT_ENVIRONMENT")
fi
if [[ -n "${INPUT_ENVIRONMENT_URL:-}" ]]; then
  args+=(-f "environment_url=$INPUT_ENVIRONMENT_URL")
fi

gh api "${args[@]}" --silent

# Lets post.sh mark the deployment as an error if the job is cancelled.
if [[ -n "${GITHUB_STATE:-}" ]]; then
  {
    echo "state=$state"
    echo "deployment_id=$DEPLOYMENT_ID"
    echo "log_url=$log_url"
  } >>"$GITHUB_STATE"
fi
