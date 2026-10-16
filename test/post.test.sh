#!/usr/bin/env bash
# Runs post.sh against a fake gh that reports $LATEST as the deployment's
# current state and records the arguments of every call.
set -uo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir "$tmp/bin"
cat >"$tmp/bin/gh" <<'GH'
#!/usr/bin/env bash
printf '%s\n' "$@" "--" >>"$GH_ARGS_FILE"
if [[ "$2" != "--method" ]]; then
  echo "$LATEST"
fi
GH
chmod +x "$tmp/bin/gh"

failures=0

run() {
  env -i \
    PATH="$tmp/bin:$PATH" \
    GH_ARGS_FILE="$tmp/args" \
    GITHUB_SERVER_URL="https://github.com" \
    GITHUB_REPOSITORY="octo/app" \
    STATE_state="in_progress" \
    STATE_deployment_id="42" \
    STATE_log_url="https://github.com/octo/app/commit/abc123/checks" \
    LATEST="in_progress" \
    "$@" "$BASH" "$root/post.sh"
}

check() {
  local name="$1" expected="$2"
  touch "$tmp/args"
  if diff -u <(printf '%s' "$expected") "$tmp/args"; then
    echo "ok - $name"
  else
    echo "not ok - $name"
    failures=$((failures + 1))
  fi
  rm -f "$tmp/args"
}

get="api
repos/octo/app/deployments/42/statuses?per_page=1
--jq
.[0].state
--
"

run >/dev/null
check "marks an unfinished deployment as an error" "$get"'api
--method
POST
repos/octo/app/deployments/42/statuses
-f
state=error
-f
log_url=https://github.com/octo/app/commit/abc123/checks
-f
target_url=https://github.com/octo/app/commit/abc123/checks
-f
description=Deployment cancelled
-F
auto_inactive=false
--silent
--
'

run LATEST="error" >/dev/null
check "leaves a deployment a later step finished" "$get"

run STATE_state="success" >/dev/null
check "does nothing after a final state" ""

run STATE_state="" >/dev/null
check "does nothing when the main step didn't set a status" ""

exit "$failures"
