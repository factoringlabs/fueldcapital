# GitHub Actions workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | every PR, push to `main`, or called by `deploy.yml` | build all workspaces, lint, run API tests. No AWS access. |
| `terraform-plan.yml` | PR touching `terraform/**` | `terraform plan` for dev/staging/prod, comments the outcome on the PR. Read-only. |
| `terraform-apply.yml` | manual (`workflow_dispatch`) only | `terraform apply` for the chosen environment. Never automatic. |
| `deploy.yml` | push to `main` touching app code (auto -> dev) or manual (`workflow_dispatch`, any environment) | builds+pushes Docker images, runs the DB migration as a one-off ECS task, updates the ECS services, updates the 4 Lambda functions' code. |

## One-time setup this repo needs before any of these actually work

1. **Repo secrets** (Settings -> Secrets and variables -> Actions):
   - `AWS_DEPLOY_ROLE_ARN` — from `terraform output github_deploy_role_arn` (per environment; if the
     ARNs differ across envs, set these as **Environment** secrets instead of repo-level).
   - `AWS_TERRAFORM_ROLE_ARN` — from `terraform output github_terraform_role_arn`.
2. **Repo variable**: `AWS_REGION` (e.g. `us-east-1`).
3. **GitHub Environments** (Settings -> Environments): create `dev`, `staging`, `prod`. Add
   required reviewers to `staging` and `prod` so `terraform-apply.yml` and a manual `deploy.yml`
   run against them pause for approval. `dev` can be left unprotected for fast iteration.
4. Both OIDC roles only trust `repo:factoringlabs/fueldcapital:ref:refs/heads/main` (see
   `terraform/modules/iam`) — workflows running from other branches/forks can't assume them.

None of this has been configured yet; these workflows will fail at the `configure-aws-credentials`
step until the secrets/roles above exist.
