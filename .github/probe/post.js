(async () => {
  const env = process.env;
  console.log("post ran, finish=" + env.INPUT_FINISH);
  console.log("env names:", Object.keys(env).filter((k) => !k.startsWith("INPUT_TOKEN")).sort().join(" "));
  const res = await fetch(`${env.GITHUB_API_URL}/repos/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}/attempts/${env.GITHUB_RUN_ATTEMPT}/jobs`, {
    headers: { authorization: `Bearer ${env.INPUT_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "probe" },
  });
  console.log("jobs api", res.status);
  const body = await res.json();
  for (const job of body.jobs || []) {
    console.log(JSON.stringify({ name: job.name, runner: job.runner_name, status: job.status, conclusion: job.conclusion, steps: job.steps.map((s) => [s.name, s.status, s.conclusion]) }));
  }
  console.log("RUNNER_NAME", env.RUNNER_NAME, "GITHUB_JOB", env.GITHUB_JOB);
})();
