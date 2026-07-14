output "cloudfront_domain_name" {
  value = module.cdn.distribution_domain_name
}

output "cloudfront_distribution_id" {
  value = module.cdn.distribution_id
}

output "api_alb_dns_name" {
  value = module.api_service.alb_dns_name
}

output "web_alb_dns_name" {
  value = module.web_service.alb_dns_name
}

output "api_ecr_repository_url" {
  value = module.api_service.ecr_repository_url
}

output "web_ecr_repository_url" {
  value = module.web_service.ecr_repository_url
}

output "cognito_user_pool_id" {
  value = module.cognito.user_pool_id
}

output "cognito_client_id" {
  value = module.cognito.client_id
}

output "database_endpoint" {
  value = module.database.endpoint
}

output "github_deploy_role_arn" {
  description = "Set as AWS_DEPLOY_ROLE_ARN in the GitHub Actions repo/environment secrets."
  value       = module.iam.github_deploy_role_arn
}

output "github_terraform_role_arn" {
  description = "Set as AWS_TERRAFORM_ROLE_ARN in the GitHub Actions repo/environment secrets."
  value       = module.iam.github_terraform_role_arn
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}
