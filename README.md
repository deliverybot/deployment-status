# Status Action

Marks a deployment status for GitHub actions.

## Parameters

### Inputs

- `state`: Deployment state. (default: pending)
- `description`: Descriptive message about the deployment state.
- `log-url`: Log url location.
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
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 16

    - name: 'deployment pending'
      uses: 'deliverybot/deployment-status@v2'
      with:
        state: 'pending'

    - name: 'deploy'
      run: |
        npm run deploy

    - name: 'deployment success'
      if: success()
      uses: 'deliverybot/deployment-status@v2'
      with:
        state: 'success'

    - name: 'deployment failure'
      if: failure()
      uses: 'deliverybot/deployment-status@v2'
      with:
        state: 'failure'
```
