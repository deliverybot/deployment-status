#!/usr/bin/env bash
# Runs status.sh against a fake gh that records its arguments.
set -uo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir "$tmp/bin" "$tmp/empty"
cat >"$tmp/bin/gh" <<'GH'
#!/usr/bin/env bash
printf '%s\n' "GH_HOST=$GH_HOST" "$@" >"$GH_ARGS_FILE"
GH
chmod +x "$tmp/bin/gh"

failures=0

run() {
  env -i \
    PATH="$tmp/bin:$PATH" \
    GH_ARGS_FILE="$tmp/args" \
    GITHUB_SERVER_URL="https://github.com" \
    GITHUB_REPOSITORY="octo/app" \
    GITHUB_SHA="abc123" \
    GITHUB_EVENT_NAME="deployment" \
    DEPLOYMENT_ID="42" \
    INPUT_STATE="success" \
    "$@" "$BASH" "$root/status.sh"
}

check() {
  local name="$1" expected="$2"
  if diff -u <(printf '%s\n' "$expected") "$tmp/args"; then
    echo "ok - $name"
  else
    echo "not ok - $name"
    failures=$((failures + 1))
  fi
  rm -f "$tmp/args"
}

run >/dev/null
check "defaults" "GH_HOST=github.com
api
--method
POST
repos/octo/app/deployments/42/statuses
-f
state=success
-f
log_url=https://github.com/octo/app/commit/abc123/checks
-f
target_url=https://github.com/octo/app/commit/abc123/checks
-f
description=
-F
auto_inactive=true
--silent"

run INPUT_STATE="in_progress" >/dev/null
check "keeps earlier deployments active while not successful" "GH_HOST=github.com
api
--method
POST
repos/octo/app/deployments/42/statuses
-f
state=in_progress
-f
log_url=https://github.com/octo/app/commit/abc123/checks
-f
target_url=https://github.com/octo/app/commit/abc123/checks
-f
description=
-F
auto_inactive=false
--silent"

run INPUT_STATE="failure" INPUT_AUTO_INACTIVE="true" >/dev/null
check "explicit auto-inactive" "GH_HOST=github.com
api
--method
POST
repos/octo/app/deployments/42/statuses
-f
state=failure
-f
log_url=https://github.com/octo/app/commit/abc123/checks
-f
target_url=https://github.com/octo/app/commit/abc123/checks
-f
description=
-F
auto_inactive=true
--silent"

run INPUT_LOG_URL="https://ci.example.com/run/1" INPUT_DESCRIPTION="Deployed it" \
  INPUT_ENVIRONMENT="production" INPUT_ENVIRONMENT_URL="https://app.example.com" \
  GITHUB_SERVER_URL="https://ghe.example.com" >/dev/null
check "optional inputs and GitHub Enterprise Server" "GH_HOST=ghe.example.com
api
--method
POST
repos/octo/app/deployments/42/statuses
-f
state=success
-f
log_url=https://ci.example.com/run/1
-f
target_url=https://ci.example.com/run/1
-f
description=Deployed it
-F
auto_inactive=true
-f
environment=production
-f
environment_url=https://app.example.com
--silent"

expect_failure() {
  local name="$1" message="$2"
  shift 2
  local output
  if output="$(run "$@" 2>&1)"; then
    echo "not ok - $name (exited 0)"
    failures=$((failures + 1))
  elif [[ "$output" != *"$message"* ]]; then
    echo "not ok - $name (output: $output)"
    failures=$((failures + 1))
  else
    echo "ok - $name"
  fi
}

expect_failure "no deployment" "No deployment to update" DEPLOYMENT_ID="" GITHUB_EVENT_NAME="push"
expect_failure "invalid auto-inactive" "auto-inactive must be" INPUT_AUTO_INACTIVE="yes"
expect_failure "gh missing" "gh) is not installed" PATH="$tmp/empty"

exit "$failures"
