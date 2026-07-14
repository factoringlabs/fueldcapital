# Terraform — Fueled Capital infrastructure

Single AWS account (567947663867), dev/staging/prod separated by naming rather than the
`terraform workspace` feature: each environment is its own root module
(`envs/dev`, `envs/staging`, `envs/prod`) with its own state file, calling the same
`modules/app` wrapper with different variable values. This avoids the class of mistakes where
`terraform workspace select` silently points at the wrong environment.

**Nothing in this directory has been applied.** No Terraform CLI or AWS credentials were
available in the environment this was built in — every module was written and reviewed by hand,
not validated with `terraform validate`/`plan`. Run both before a real `apply`.

## Layout

```
terraform/
  bootstrap/        One-time: creates the S3 state bucket + DynamoDB lock table. Local state.
  modules/
    network/         VPC, subnets, NAT, security groups
    database/        RDS Postgres, RDS-managed master password (Secrets Manager)
    cognito/         User pool, ADMIN/BROKER/MACHINERY_COMPANY groups, web app client
    s3/               Single reusable bucket module (invoice-docs, kyb-docs — 2 instantiations)
    iam/              ECS task/execution roles, Lambda execution role, GitHub OIDC + 2 deploy roles
    ecs-service/     Reusable Fargate service + ALB (2 instantiations: api, web)
    cloudfront/      Distribution fronting both ALBs (path-based: /api/* -> api, default -> web)
    lambda/           Reusable Lambda function shell (4 instantiations — see apps/lambdas)
    eventbridge/     Scheduled rules + S3 upload event wiring for the 4 Lambdas
    app/              Wraps all of the above into one environment — envs/* just call this
  envs/
    dev/ staging/ prod/   Backend config + tfvars, each calling modules/app
```

## Prerequisites before any real `apply`

1. **State backend**: `cd terraform/bootstrap && terraform init && terraform apply` (uses local
   state, run once, by hand). Creates `fueledcapital-terraform-state` (S3) and
   `fueledcapital-terraform-locks` (DynamoDB) that every `envs/*/versions.tf` backend block
   references.
2. **Domain + ACM certs**: register/delegate a domain (e.g. in Route 53), then issue an ACM
   certificate for it in `us-east-1` (CloudFront requirement) and one in your working region if
   different (for the ALB listeners — can be the same cert if the region is `us-east-1`, which is
   what the defaults assume). Set `domain_name`, `acm_certificate_arn_regional`, and
   `acm_certificate_arn_cloudfront` in a `terraform.tfvars` (copy from `terraform.tfvars.example`
   in each env directory — gitignored, never commit real ARNs/domains alongside placeholders).
3. **First apply uses a placeholder container image** (`public.ecr.aws/nginx/nginx:latest`) so
   Terraform doesn't need a pre-built image from a repo that doesn't exist yet. The deploy
   workflow's first successful run replaces it — see `.github/workflows/deploy.yml`.
4. **GitHub Actions secrets**: after the first `apply`, copy the `github_deploy_role_arn` and
   `github_terraform_role_arn` outputs into the repo's Actions secrets
   (`AWS_DEPLOY_ROLE_ARN`, `AWS_TERRAFORM_ROLE_ARN`) so the workflows can assume them via OIDC —
   no long-lived AWS access keys anywhere.

## Running it

```bash
cd terraform/envs/dev
terraform init
terraform plan   # review carefully — this provisions real, billed AWS resources
terraform apply  # requires explicit confirmation; do not automate this without sign-off
```

## Things deliberately left for a human to decide, not Terraform defaults

- **ACM certs and the domain itself** — can't be created without owning/delegating a real domain.
- **First `terraform apply` per environment** — provisions real infrastructure and starts
  incurring cost; run it deliberately, not as part of an automated pipeline, until the deploy
  workflow has been exercised against dev at least once.
- **`envs/prod`** — additionally gate this behind the "Known open items" in the root README
  (settlement waterfall order, late-fee terms) being resolved, since prod is where those decisions
  become real money movement.
