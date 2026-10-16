const { input, run } = require("./run");

run("status.sh", {
  GH_TOKEN: input("token"),
  INPUT_STATE: input("state"),
  INPUT_LOG_URL: input("log-url"),
  INPUT_DESCRIPTION: input("description"),
  INPUT_ENVIRONMENT: input("environment"),
  INPUT_ENVIRONMENT_URL: input("environment-url"),
  DEPLOYMENT_ID: input("deployment-id"),
  INPUT_AUTO_INACTIVE: input("auto-inactive"),
});
