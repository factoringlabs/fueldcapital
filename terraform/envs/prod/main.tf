module "app" {
  source = "../../modules/app"

  project_name       = var.project_name
  environment        = var.environment
  aws_region         = var.aws_region
  availability_zones = var.availability_zones

  domain_name                    = var.domain_name
  acm_certificate_arn_regional   = var.acm_certificate_arn_regional
  acm_certificate_arn_cloudfront = var.acm_certificate_arn_cloudfront

  github_repository   = var.github_repository
  api_container_image = var.api_container_image
  web_container_image = var.web_container_image

  # prod: resilience over cost — per-AZ NAT, Multi-AZ RDS, deletion
  # protection, 2 tasks per service minimum (autoscaling handles the rest).
  single_nat_gateway     = false
  db_instance_class      = "db.t4g.medium"
  db_multi_az             = true
  db_deletion_protection = true
  api_desired_count      = 2
  web_desired_count      = 2
  api_cpu                = 1024
  api_memory             = 2048
  web_cpu                 = 1024
  web_memory               = 2048
}
