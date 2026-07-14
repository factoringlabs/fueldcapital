output "cloudfront_domain_name" {
  value = module.app.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  value = module.app.cloudfront_distribution_id
}

output "api_alb_dns_name" {
  value = module.app.api_alb_dns_name
}

output "web_alb_dns_name" {
  value = module.app.web_alb_dns_name
}

output "api_ecr_repository_url" {
  value = module.app.api_ecr_repository_url
}

output "web_ecr_repository_url" {
  value = module.app.web_ecr_repository_url
}

output "cognito_user_pool_id" {
  value = module.app.cognito_user_pool_id
}

output "cognito_client_id" {
  value = module.app.cognito_client_id
}

output "database_endpoint" {
  value = module.app.database_endpoint
}

output "github_deploy_role_arn" {
  value = module.app.github_deploy_role_arn
}

output "github_terraform_role_arn" {
  value = module.app.github_terraform_role_arn
}

output "ecs_cluster_name" {
  value = module.app.ecs_cluster_name
}
