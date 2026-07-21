locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

data "aws_caller_identity" "current" {}

# --- ECS task execution role: pulls images, writes logs, reads the DB secret
# and INTERNAL_API_KEY secret to inject into the container as env vars. ---

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_task_execution" {
  name               = "${local.name_prefix}-ecs-task-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_managed" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "ecs_task_execution_secrets" {
  statement {
    sid       = "ReadTaskSecrets"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = compact([var.db_secret_arn, var.internal_api_key_secret_arn, var.anthropic_api_key_secret_arn])
  }
}

resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name   = "${local.name_prefix}-ecs-task-execution-secrets"
  role   = aws_iam_role.ecs_task_execution.id
  policy = data.aws_iam_policy_document.ecs_task_execution_secrets.json
}

# --- ECS task role: what the running application itself is allowed to do. ---

resource "aws_iam_role" "ecs_task" {
  name               = "${local.name_prefix}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
  tags               = var.tags
}

data "aws_iam_policy_document" "ecs_task_app" {
  statement {
    sid       = "InvoiceAndKybDocuments"
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = [for arn in var.s3_bucket_arns : "${arn}/*"]
  }
}

resource "aws_iam_role_policy" "ecs_task_app" {
  name   = "${local.name_prefix}-ecs-task-app"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.ecs_task_app.json
}

# --- Lambda execution role: the 4 background handlers (see apps/lambdas). ---

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_execution" {
  name               = "${local.name_prefix}-lambda-execution"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_secrets" {
  statement {
    sid       = "ReadInternalApiKey"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.internal_api_key_secret_arn]
  }
}

resource "aws_iam_role_policy" "lambda_secrets" {
  name   = "${local.name_prefix}-lambda-secrets"
  role   = aws_iam_role.lambda_execution.id
  policy = data.aws_iam_policy_document.lambda_secrets.json
}

# --- GitHub Actions OIDC federation: no long-lived AWS access keys in GitHub secrets. ---

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  # GitHub's published OIDC root CA thumbprints — verify against
  # https://github.blog/changelog/2023-06-27-github-actions-oidc-thumbprint-update/
  # before relying on this in a real apply.
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]
  tags = var.tags
}

data "aws_iam_policy_document" "github_deploy_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # A GitHub Actions job's OIDC "sub" claim format depends on how it's
    # triggered — repo:OWNER/REPO:ref:refs/heads/BRANCH for a plain push,
    # but repo:OWNER/REPO:environment:NAME once the job is tied to a GitHub
    # Environment (which deploy.yml and terraform-apply.yml both are, so
    # staging/prod can require reviewer approval), and yet another form for
    # pull_request triggers (terraform-plan.yml). Rather than enumerate every
    # format, scope by repo only here — WHEN a workflow is allowed to run
    # with these permissions is already enforced by GitHub itself (branch
    # protections, required reviewers on the Environment), before it ever
    # requests a token AWS would see.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:*"]
    }
  }
}

# Routine app deploys (image build + push, ECS service update, Lambda code
# update) — deliberately narrower than the terraform-apply role below.
resource "aws_iam_role" "github_deploy" {
  name               = "${local.name_prefix}-gha-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_deploy_assume.json
  tags               = var.tags
}

data "aws_iam_policy_document" "github_deploy_permissions" {
  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    sid = "EcrPush"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
    ]
    resources = var.ecr_repository_arns
  }
  statement {
    sid = "EcsDeploy"
    actions = [
      "ecs:DescribeServices",
      "ecs:DescribeTaskDefinition",
      "ecs:RegisterTaskDefinition",
      "ecs:UpdateService",
      "ecs:RunTask",
      "ecs:DescribeTasks",
    ]
    resources = ["*"] # Most of these ECS actions don't support resource-level scoping.
  }
  statement {
    sid       = "EcsUpdateServiceScoped"
    actions   = ["ecs:UpdateService"]
    resources = [var.ecs_cluster_arn]
  }
  statement {
    sid       = "LambdaCodeUpdate"
    actions   = ["lambda:UpdateFunctionCode", "lambda:GetFunction"]
    resources = var.lambda_function_arns
  }
  statement {
    sid       = "PassEcsRoles"
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.ecs_task_execution.arn, aws_iam_role.ecs_task.arn]
  }
  statement {
    # Read-only lookups the deploy workflow uses to find the right private
    # subnets/security group for the one-off migration task (see deploy.yml's
    # "Resolve network config" step) — EC2 describe calls don't support
    # resource-level scoping either.
    sid       = "DescribeNetworkForMigrationTask"
    actions   = ["ec2:DescribeSubnets", "ec2:DescribeSecurityGroups"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_deploy_permissions" {
  name   = "${local.name_prefix}-gha-deploy-permissions"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy_permissions.json
}

# Infra changes (terraform plan/apply) — separate, deliberately broader role.
# The workflow gates this behind a GitHub Environment manual-approval, not
# just the trust policy, since Terraform needs wide service coverage.
resource "aws_iam_role" "github_terraform" {
  name               = "${local.name_prefix}-gha-terraform"
  assume_role_policy = data.aws_iam_policy_document.github_deploy_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "github_terraform_admin" {
  role       = aws_iam_role.github_terraform.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

# PowerUserAccess excludes IAM; Terraform manages IAM roles/policies in this
# repo, so grant that narrowly and explicitly rather than reaching for
# AdministratorAccess.
data "aws_iam_policy_document" "github_terraform_iam" {
  statement {
    sid = "ManageProjectIamResources"
    actions = [
      "iam:CreateRole", "iam:DeleteRole", "iam:GetRole", "iam:UpdateRole",
      "iam:CreatePolicy", "iam:DeletePolicy", "iam:GetPolicy", "iam:ListPolicyVersions", "iam:CreatePolicyVersion", "iam:DeletePolicyVersion",
      "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:PutRolePolicy", "iam:DeleteRolePolicy", "iam:GetRolePolicy",
      "iam:TagRole", "iam:UntagRole", "iam:PassRole",
      "iam:CreateOpenIDConnectProvider", "iam:DeleteOpenIDConnectProvider", "iam:GetOpenIDConnectProvider", "iam:UpdateOpenIDConnectProviderThumbprint",
    ]
    resources = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project_name}-*",
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/${var.project_name}-*",
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com",
    ]
  }
}

resource "aws_iam_role_policy" "github_terraform_iam" {
  name   = "${local.name_prefix}-gha-terraform-iam"
  role   = aws_iam_role.github_terraform.id
  policy = data.aws_iam_policy_document.github_terraform_iam.json
}
