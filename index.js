const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
  try {
    const context = github.context;
    const defaultUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${context.sha}/checks`;

    const token = core.getInput("token", {required: true});
    const state = core.getInput("state", {required: true});
    const url = core.getInput("log-url", {required: false}) || defaultUrl;
    const description = core.getInput("description", {required: false});

    const client = new github.GitHub(token);

    await client.repos.createDeploymentStatus({
      ...context.repo,
      deployment_id: context.payload.deployment.id,
      state,
      log_url: url,
      target_url: url,
      description,
    });
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run();
