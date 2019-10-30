# Status Action

Marks a deployment status for GitHub actions.

## Parameters

### Inputs

- `state`: Deployment state. (default: pending)
- `description`: Descriptive message about the deployment state.
- `log-url`: The full URL of the deployment's output.
- `env-url`: URL for accessing your environment.
- `token`: Github repository token.

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
      uses: 'deliverybot/deployment-status@master'
      with:
        state: 'pending'
        token: '${{ github.token }}'

    - name: 'deploy'
      run: |
        npm run deploy

    - name: 'deployment success'
      if: success()
      uses: 'deliverybot/deployment-status@master'
      with:
        state: 'success'
        token: '${{ github.token }}'

    - name: 'deployment failure'
      if: failure()
      uses: 'deliverybot/deployment-status@master'
      with:
        state: 'failure'
        token: '${{ github.token }}'
```
