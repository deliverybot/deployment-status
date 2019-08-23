const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
  try {
    const token = core.getInput("token", {required: true});
    const state = core.getInput("state", {required: true});
    const log_url = core.getInput("log-url", {required: false});
    const description = core.getInput("description", {required: false});

    const client = new github.GitHub(token);
    const context = github.context;

    console.log(context);

    await client.repos.createDeploymentStatus({
      ...context.repo,
      deployment_id: context.payload.deployment.id,
      state,
      log_url,
      description,
    });
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run();
