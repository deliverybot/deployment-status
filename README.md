# Status Action

Marks a deployment status for GitHub actions.

## Parameters

### Inputs

- `state`: Deployment state. (default: pending)
- `description`: Descriptive message about the deployment state.
- `log-url`: Log url location.
- `deployment-id`: Optional deployment ID to provide, if this action was triggered outside of a `deployment` event.
- `token`: Github repository token.
- `environment`: Name for the target deployment environment, which can be changed when setting a deploy status.
- `environment-url`: URL for accessing your environment.

## Example

```yaml
# .github/workflows/deploy.yml
name: Deploy

on: ['deployment']

jobs:
  deployment:

    runs-on: 'ubuntu-latest'

    steps:
    - uses: actions/checkout@v1
    - name: 'use node 8.x'
      uses: actions/setup-node@v1
      with:
        node-version: 8.x

    - name: 'deployment pending'
      uses: 'deliverybot/deployment-status@v1'
      with:
        state: 'pending'
        token: '${{ github.token }}'

    - name: 'deploy'
      run: |
        npm run deploy

    - name: 'deployment success'
      if: success()
      uses: 'deliverybot/deployment-status@v1'
      with:
        state: 'success'
        token: '${{ github.token }}'

    - name: 'deployment failure'
      if: failure()
      uses: 'deliverybot/deployment-status@v1'
      with:
        state: 'failure'
        token: '${{ github.token }}'
```
