const { input, run } = require("./run");

run("post.sh", { GH_TOKEN: input("token") });
