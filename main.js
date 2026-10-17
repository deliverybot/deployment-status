const fs = require("node:fs");
const { main } = require("./status");

main(process.env, fetch, fs.appendFileSync).catch((error) => {
  console.log(`::error::${error.message}`);
  process.exitCode = 1;
});
