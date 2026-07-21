module "app" {
  source = "../../modules/app"

  project_name       = var.project_name
  environment        = var.environment
  aws_region         = var.aws_region
  availability_zones = var.availability_zones

  domain_name                    = var.domain_name
  acm_certificate_arn_regional   = var.acm_certificate_arn_regional
  acm_certificate_arn_cloudfront = var.acm_certificate_arn_cloudfront

  github_repository    = var.github_repository
  api_container_image  = var.api_container_image
  web_container_image  = var.web_container_image

  # dev: cost over resilience
  single_nat_gateway      = true
  db_instance_class       = "db.t4g.micro"
  db_multi_az              = false
  db_deletion_protection  = false
  api_desired_count       = 1
  web_desired_count       = 1
  api_cpu                 = 512
  api_memory              = 1024
  web_cpu                  = 512
  web_memory               = 1024

  # Real Cognito login isn't built into apps/web yet — keep the API's
  # dev-mode x-dev-user-id sign-in bypass active in dev until it is.
  cognito_auth_enabled = false

  anthropic_api_key = var.anthropic_api_key
}
