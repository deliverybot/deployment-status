// Sets deployment statuses through the GitHub API. main.js and post.js call
// this with the runner's environment and the global fetch; the tests pass
// their own.

const UNFINISHED = ["queued", "pending", "in_progress"];

// The runner passes inputs as INPUT_<NAME>, keeping dashes.
function input(env, name) {
  return (env[`INPUT_${name.toUpperCase()}`] || "").trim();
}

function client(env, fetch) {
  const apiUrl = env.GITHUB_API_URL || "https://api.github.com";
  return async (method, path, body) => {
    const response = await fetch(`${apiUrl}/${path}`, {
      method,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${input(env, "token")}`,
        "content-type": "application/json",
        "user-agent": "deliverybot/deployment-status",
        "x-github-api-version": "2022-11-28",
      },
      body: body && JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`${method} ${path} failed with ${response.status}: ${await response.text()}`);
    }
    return response.json();
  };
}

// Appends a value for the post step, which reads it back as STATE_<name>.
function saveState(env, appendFile, name, value) {
  if (env.GITHUB_STATE) {
    appendFile(env.GITHUB_STATE, `${name}=${value}\n`);
  }
}

async function main(env, fetch, appendFile) {
  const deploymentId = input(env, "deployment-id");
  if (!deploymentId) {
    throw new Error(
      `No deployment to update. Run this action on a "deployment" event or pass deployment-id (this run was triggered by "${env.GITHUB_EVENT_NAME || "unknown"}").`,
    );
  }

  const state = input(env, "state") || "pending";
  const logUrl =
    input(env, "log-url") || `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/commit/${env.GITHUB_SHA}/checks`;

  // GitHub marks earlier successful deployments to the environment inactive
  // whenever a new status is created, unless auto_inactive is false. Only let a
  // successful deployment do that, so a deployment that is still running or
  // has failed doesn't replace the one that is actually live.
  let autoInactive = input(env, "auto-inactive");
  if (!autoInactive) {
    autoInactive = state === "success" ? "true" : "false";
  } else if (autoInactive !== "true" && autoInactive !== "false") {
    throw new Error(`auto-inactive must be "true" or "false", got "${autoInactive}".`);
  }

  const status = {
    state,
    log_url: logUrl,
    target_url: logUrl,
    description: input(env, "description"),
    auto_inactive: autoInactive === "true",
  };
  if (input(env, "environment")) {
    status.environment = input(env, "environment");
  }
  if (input(env, "environment-url")) {
    status.environment_url = input(env, "environment-url");
  }

  const api = client(env, fetch);
  await api("POST", `repos/${env.GITHUB_REPOSITORY}/deployments/${deploymentId}/statuses`, status);

  // Lets the post step mark the deployment as an error if the job is cancelled.
  saveState(env, appendFile, "state", state);
  saveState(env, appendFile, "deployment_id", deploymentId);
  saveState(env, appendFile, "log_url", logUrl);
}

// Runs after the job when it was cancelled (post-if in action.yml). A
// deployment the main step left queued, pending or in_progress would otherwise
// stay that way forever, so mark it as an error, unless a later step already
// gave it another state.
async function post(env, fetch, log) {
  if (!UNFINISHED.includes(env.STATE_state)) {
    return;
  }

  const api = client(env, fetch);
  const statuses = `repos/${env.GITHUB_REPOSITORY}/deployments/${env.STATE_deployment_id}/statuses`;
  const [latest] = await api("GET", `${statuses}?per_page=1`);
  if (!UNFINISHED.includes(latest?.state)) {
    return;
  }

  await api("POST", statuses, {
    state: "error",
    log_url: env.STATE_log_url,
    target_url: env.STATE_log_url,
    description: "Deployment cancelled",
    auto_inactive: false,
  });
  log(`Marked deployment ${env.STATE_deployment_id} as error because the job was cancelled.`);
}

module.exports = { main, post };
