# Status Action

Marks a deployment status for GitHub actions. Run it from a workflow triggered by the `deployment` event, or pass `deployment-id`.

## Parameters

### Inputs

- `state`: Deployment state. (default: pending)
- `description`: Descriptive message about the deployment state.
- `log-url`: Log url location.
- `token`: GitHub token with `deployments: write` permission. (default: `${{ github.token }}`)
- `environment`: Name for the target deployment environment, which can be changed when setting a deploy status.
- `environment-url`: URL for accessing your environment.
- `deployment-id`: ID of the deployment to update. (default: the deployment that triggered the workflow)
- `auto-inactive`: Whether to mark earlier successful deployments to the same environment inactive. (default: `true` for `success`, `false` otherwise, so a running or failed deployment doesn't replace the live one)

If the job is cancelled while the deployment is still `queued`, `pending` or `in_progress`, the action marks it as `error` with the description "Deployment cancelled" when the job ends, so it doesn't stay in progress. A status a later step already set, such as one from an `if: cancelled()` step, is left alone.

## Example

```yaml
# .github/workflows/deploy.yml
name: Deploy

on: ["deployment"]

jobs:
  deployment:
    runs-on: "ubuntu-latest"
    permissions:
      deployments: write

    steps:
      - uses: actions/checkout@v7

      - name: "deployment pending"
        uses: "deliverybot/deployment-status@v2"
        with:
          state: "pending"
          token: "${{ github.token }}"

      - name: "deploy"
        run: |
          npm run deploy

      - name: "deployment success"
        if: success()
        uses: "deliverybot/deployment-status@v2"
        with:
          state: "success"
          token: "${{ github.token }}"

      - name: "deployment failure"
        if: failure()
        uses: "deliverybot/deployment-status@v2"
        with:
          state: "failure"
          token: "${{ github.token }}"
```

## Requirements

The action runs on Node 24 and has no dependencies. Self-hosted runners need a runner version that supports Node 24 actions.

## Development

`status.js` holds the logic: `main.js` sets the status and `post.js` runs after a cancelled job. There is no build step or `node_modules`. Run the tests with:

```sh
node --test
```

CI also runs the action against the real API by creating and then deleting a test deployment.
