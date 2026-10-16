// Starts one of the action's shell scripts with the given environment.
const { spawnSync } = require("node:child_process");
const path = require("node:path");

// The runner passes inputs as INPUT_<NAME>, keeping dashes, which bash can't read.
exports.input = (name) => process.env[`INPUT_${name.toUpperCase()}`] || "";

exports.run = (script, env) => {
  const result = spawnSync("bash", [path.join(__dirname, script)], {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.error) {
    console.log(`::error::${result.error.message}`);
  }
  process.exitCode = result.status ?? 1;
};
