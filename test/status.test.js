const assert = require("node:assert/strict");
const { test } = require("node:test");
const { main, post } = require("../status");

const ENV = {
  GITHUB_API_URL: "https://api.github.com",
  GITHUB_SERVER_URL: "https://github.com",
  GITHUB_REPOSITORY: "octo/app",
  GITHUB_SHA: "abc123",
  GITHUB_EVENT_NAME: "deployment",
  GITHUB_STATE: "/state",
  "INPUT_DEPLOYMENT-ID": "42",
  INPUT_STATE: "success",
  INPUT_TOKEN: "secret",
};
const STATUSES = "https://api.github.com/repos/octo/app/deployments/42/statuses";
const LOG_URL = "https://github.com/octo/app/commit/abc123/checks";

// Records requests and answers GETs with a deployment whose latest status is
// `latest`.
function fakeFetch({ latest = "in_progress", status = 200 } = {}) {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, method: options.method, body: options.body && JSON.parse(options.body), headers: options.headers });
    const body = options.method === "GET" ? [{ state: latest }] : {};
    return { ok: status < 300, status, json: async () => body, text: async () => "Not Found" };
  };
  return { fetch, calls };
}

async function runMain(inputs = {}) {
  const { fetch, calls } = fakeFetch();
  const state = [];
  await main({ ...ENV, ...inputs }, fetch, (_file, line) => state.push(line));
  return { calls, state };
}

test("posts a successful status that marks earlier deployments inactive", async () => {
  const { calls } = await runMain();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, STATUSES);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].headers.authorization, "Bearer secret");
  assert.deepEqual(calls[0].body, {
    state: "success",
    log_url: LOG_URL,
    target_url: LOG_URL,
    description: "",
    auto_inactive: true,
  });
});

test("keeps earlier deployments active while not successful", async () => {
  const { calls } = await runMain({ INPUT_STATE: "in_progress" });
  assert.equal(calls[0].body.auto_inactive, false);
});

test("explicit auto-inactive", async () => {
  const { calls } = await runMain({ INPUT_STATE: "failure", "INPUT_AUTO-INACTIVE": "true" });
  assert.equal(calls[0].body.auto_inactive, true);
});

test("optional inputs and GitHub Enterprise Server", async () => {
  const { calls } = await runMain({
    "INPUT_LOG-URL": "https://ci.example.com/run/1",
    INPUT_DESCRIPTION: "Deployed it",
    INPUT_ENVIRONMENT: "production",
    "INPUT_ENVIRONMENT-URL": "https://app.example.com",
    GITHUB_API_URL: "https://ghe.example.com/api/v3",
  });
  assert.equal(calls[0].url, "https://ghe.example.com/api/v3/repos/octo/app/deployments/42/statuses");
  assert.deepEqual(calls[0].body, {
    state: "success",
    log_url: "https://ci.example.com/run/1",
    target_url: "https://ci.example.com/run/1",
    description: "Deployed it",
    auto_inactive: true,
    environment: "production",
    environment_url: "https://app.example.com",
  });
});

test("saves the status for the post step", async () => {
  const { state } = await runMain({ INPUT_STATE: "in_progress" });
  assert.deepEqual(state, ["state=in_progress\n", "deployment_id=42\n", `log_url=${LOG_URL}\n`]);
});

test("fails without a deployment", async () => {
  await assert.rejects(runMain({ "INPUT_DEPLOYMENT-ID": "", GITHUB_EVENT_NAME: "push" }), /No deployment to update/);
});

test("fails on an invalid auto-inactive", async () => {
  await assert.rejects(runMain({ "INPUT_AUTO-INACTIVE": "yes" }), /auto-inactive must be/);
});

test("fails when the API refuses", async () => {
  const { fetch } = fakeFetch({ status: 404 });
  await assert.rejects(main(ENV, fetch, () => {}), /failed with 404: Not Found/);
});

const POST_ENV = {
  ...ENV,
  STATE_state: "in_progress",
  STATE_deployment_id: "42",
  STATE_log_url: LOG_URL,
};

test("post marks an unfinished deployment as an error", async () => {
  const { fetch, calls } = fakeFetch();
  await post(POST_ENV, fetch, () => {});
  assert.deepEqual(
    calls.map((call) => [call.method, call.url]),
    [
      ["GET", `${STATUSES}?per_page=1`],
      ["POST", STATUSES],
    ],
  );
  assert.deepEqual(calls[1].body, {
    state: "error",
    log_url: LOG_URL,
    target_url: LOG_URL,
    description: "Deployment cancelled",
    auto_inactive: false,
  });
});

test("post leaves a deployment a later step finished", async () => {
  const { fetch, calls } = fakeFetch({ latest: "error" });
  await post(POST_ENV, fetch, () => {});
  assert.equal(calls.length, 1);
});

test("post does nothing after a final state", async () => {
  const { fetch, calls } = fakeFetch();
  await post({ ...POST_ENV, STATE_state: "success" }, fetch, () => {});
  assert.equal(calls.length, 0);
});

test("post does nothing when the main step didn't set a status", async () => {
  const { fetch, calls } = fakeFetch();
  await post({ ...ENV }, fetch, () => {});
  assert.equal(calls.length, 0);
});
