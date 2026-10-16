#!/usr/bin/env bash
# Runs after the job when it was cancelled (post-if in action.yml). A deployment
# this step left queued, pending or in_progress would otherwise stay that way
# forever, so mark it as an error, unless a later step already gave it another
# state. status.sh saved what it set in STATE_* variables.
# shellcheck disable=SC2154 # STATE_* come from the runner.
set -euo pipefail

unfinished() {
  [[ "$1" == "queued" || "$1" == "pending" || "$1" == "in_progress" ]]
}

if ! unfinished "${STATE_state:-}"; then
  exit 0
fi

export GH_HOST="${GITHUB_SERVER_URL#*://}"
statuses="repos/$GITHUB_REPOSITORY/deployments/$STATE_deployment_id/statuses"

latest="$(gh api "$statuses?per_page=1" --jq '.[0].state')"
if ! unfinished "$latest"; then
  exit 0
fi

gh api --method POST "$statuses" \
  -f state=error \
  -f "log_url=$STATE_log_url" \
  -f "target_url=$STATE_log_url" \
  -f "description=Deployment cancelled" \
  -F auto_inactive=false \
  --silent
echo "Marked deployment $STATE_deployment_id as error because the job was cancelled."
