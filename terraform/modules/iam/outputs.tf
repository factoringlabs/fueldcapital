output "ecs_task_execution_role_arn" {
  value = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  value = aws_iam_role.ecs_task.arn
}

output "lambda_execution_role_arn" {
  value = aws_iam_role.lambda_execution.arn
}

output "github_deploy_role_arn" {
  description = "For the GitHub Actions app-deploy workflow's permissions: id-token/aws-actions/configure-aws-credentials role-to-assume."
  value       = aws_iam_role.github_deploy.arn
}

output "github_terraform_role_arn" {
  description = "For the GitHub Actions terraform plan/apply workflow — gate behind a protected Environment."
  value       = aws_iam_role.github_terraform.arn
}
