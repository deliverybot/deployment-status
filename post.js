const { post } = require("./status");

post(process.env, fetch, console.log).catch((error) => {
  console.log(`::error::${error.message}`);
  process.exitCode = 1;
});
