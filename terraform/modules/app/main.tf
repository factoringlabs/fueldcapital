# Wraps every module into one complete environment. envs/dev, envs/staging,
# and envs/prod each just set backend/provider and call this module with
# different variable values — this is the "naming, not workspaces" approach
# to environment separation: identical topology, no risk of one environment's
# root config drifting out of sync with another's by hand-editing copies.

locals {
  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

module "network" {
  source = "../network"

  project_name       = var.project_name
  environment        = var.environment
  availability_zones = var.availability_zones
  single_nat_gateway = var.single_nat_gateway
  tags               = local.tags
}

module "database" {
  source = "../database"

  project_name         = var.project_name
  environment          = var.environment
  vpc_id               = module.network.vpc_id
  subnet_ids           = module.network.private_subnet_ids
  security_group_id    = module.network.database_security_group_id
  instance_class       = var.db_instance_class
  multi_az             = var.db_multi_az
  deletion_protection  = var.db_deletion_protection
  tags                 = local.tags
}

module "cognito" {
  source = "../cognito"

  project_name  = var.project_name
  environment   = var.environment
  callback_urls = ["https://${var.domain_name}/api/auth/callback"]
  logout_urls   = ["https://${var.domain_name}/login"]
  tags          = local.tags
}

module "invoice_docs_bucket" {
  source = "../s3"

  project_name    = var.project_name
  environment     = var.environment
  bucket_purpose  = "invoice-docs"
  allowed_origins = ["https://${var.domain_name}"]
  tags            = local.tags
}

module "kyb_docs_bucket" {
  source = "../s3"

  project_name    = var.project_name
  environment     = var.environment
  bucket_purpose  = "kyb-docs"
  allowed_origins = ["https://${var.domain_name}"]
  tags            = local.tags
}

# Shared secret Lambda handlers use to call /internal/* — generated here so
# it never needs to be typed/committed anywhere; both ECS and Lambda read it
# from this same secret.
resource "aws_secretsmanager_secret" "internal_api_key" {
  name = "${var.project_name}-${var.environment}-internal-api-key"
  tags = local.tags
}

resource "random_password" "internal_api_key" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret_version" "internal_api_key" {
  secret_id     = aws_secretsmanager_secret.internal_api_key.id
  secret_string = random_password.internal_api_key.result
}

resource "aws_ecs_cluster" "this" {
  name = "${var.project_name}-${var.environment}"
  tags = local.tags

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

module "iam" {
  source = "../iam"

  project_name                = var.project_name
  environment                 = var.environment
  s3_bucket_arns              = [module.invoice_docs_bucket.bucket_arn, module.kyb_docs_bucket.bucket_arn]
  db_secret_arn               = module.database.master_user_secret_arn
  internal_api_key_secret_arn = aws_secretsmanager_secret.internal_api_key.arn
  ecs_cluster_arn             = aws_ecs_cluster.this.arn
  ecr_repository_arns         = [module.api_service.ecr_repository_arn, module.web_service.ecr_repository_arn]
  lambda_function_arns = [
    module.lambda_ocr_extraction.function_arn,
    module.lambda_monthly_fee_run.function_arn,
    module.lambda_reserve_release_check.function_arn,
    module.lambda_notification_sender.function_arn,
  ]
  github_repository = var.github_repository
  tags               = local.tags
}

module "api_service" {
  source = "../ecs-service"

  project_name                  = var.project_name
  environment                   = var.environment
  service_name                  = "api"
  cluster_id                    = aws_ecs_cluster.this.id
  vpc_id                        = module.network.vpc_id
  public_subnet_ids             = module.network.public_subnet_ids
  private_subnet_ids            = module.network.private_subnet_ids
  alb_security_group_id         = module.network.alb_security_group_id
  ecs_service_security_group_id = module.network.ecs_service_security_group_id
  task_execution_role_arn       = module.iam.ecs_task_execution_role_arn
  task_role_arn                 = module.iam.ecs_task_role_arn
  container_port                = 4000
  health_check_path             = "/health"
  cpu                           = var.api_cpu
  memory                        = var.api_memory
  desired_count                 = var.api_desired_count
  container_image                = var.api_container_image
  acm_certificate_arn            = var.acm_certificate_arn_regional
  environment_variables = {
    PORT                      = "4000"
    AWS_REGION                = var.aws_region
    COGNITO_USER_POOL_ID      = var.cognito_auth_enabled ? module.cognito.user_pool_id : ""
    COGNITO_CLIENT_ID          = var.cognito_auth_enabled ? module.cognito.client_id : ""
    STORAGE_PROVIDER           = "s3"
    S3_INVOICE_DOCS_BUCKET     = module.invoice_docs_bucket.bucket_name
    S3_KYB_DOCS_BUCKET         = module.kyb_docs_bucket.bucket_name
    OCR_PROVIDER                = "stub"
    DEFAULT_ADVANCE_PCT         = "95"
    FUNDING_SLA_BUSINESS_DAYS   = "2"
    # Non-secret DB connection parts; DB_PASSWORD (below) is the only secret
    # piece. The container entrypoint composes DATABASE_URL from these — see
    # apps/api/docker-entrypoint.sh — since RDS's managed secret holds
    # username+password as JSON, not a ready-made connection string.
    DB_HOST     = module.database.endpoint
    DB_PORT     = tostring(module.database.port)
    DB_NAME     = module.database.db_name
    DB_USERNAME = module.database.master_username
  }
  secrets = {
    # ECS extracts just the "password" key from the RDS-managed JSON secret.
    DB_PASSWORD      = "${module.database.master_user_secret_arn}:password::"
    INTERNAL_API_KEY = aws_secretsmanager_secret.internal_api_key.arn
  }
  tags = local.tags
}

module "web_service" {
  source = "../ecs-service"

  project_name                  = var.project_name
  environment                   = var.environment
  service_name                  = "web"
  cluster_id                    = aws_ecs_cluster.this.id
  vpc_id                        = module.network.vpc_id
  public_subnet_ids             = module.network.public_subnet_ids
  private_subnet_ids            = module.network.private_subnet_ids
  alb_security_group_id         = module.network.alb_security_group_id
  ecs_service_security_group_id = module.network.ecs_service_security_group_id
  task_execution_role_arn       = module.iam.ecs_task_execution_role_arn
  task_role_arn                 = module.iam.ecs_task_role_arn
  container_port                 = 3000
  health_check_path              = "/login"
  cpu                            = var.web_cpu
  memory                         = var.web_memory
  desired_count                  = var.web_desired_count
  container_image                = var.web_container_image
  acm_certificate_arn            = var.acm_certificate_arn_regional
  environment_variables = {
    API_BASE_URL = "https://${var.domain_name}/api"
  }
  tags = local.tags
}

module "cdn" {
  source = "../cloudfront"

  project_name           = var.project_name
  environment             = var.environment
  web_origin_domain_name  = module.web_service.alb_dns_name
  api_origin_domain_name  = module.api_service.alb_dns_name
  domain_aliases          = var.acm_certificate_arn_cloudfront != "" ? [var.domain_name] : []
  acm_certificate_arn      = var.acm_certificate_arn_cloudfront != "" ? var.acm_certificate_arn_cloudfront : null
  price_class              = var.environment == "prod" ? "PriceClass_All" : "PriceClass_100"
  tags                     = local.tags
}

module "lambda_ocr_extraction" {
  source = "../lambda"

  project_name       = var.project_name
  environment        = var.environment
  function_name      = "ocr-extraction-trigger"
  execution_role_arn = module.iam.lambda_execution_role_arn
  environment_variables = {
    API_BASE_URL = "https://${var.domain_name}/api"
  }
  tags = local.tags
}

module "lambda_monthly_fee_run" {
  source = "../lambda"

  project_name       = var.project_name
  environment        = var.environment
  function_name      = "monthly-fee-run"
  execution_role_arn = module.iam.lambda_execution_role_arn
  timeout            = 300
  environment_variables = {
    API_BASE_URL = "https://${var.domain_name}/api"
  }
  tags = local.tags
}

module "lambda_reserve_release_check" {
  source = "../lambda"

  project_name       = var.project_name
  environment        = var.environment
  function_name      = "reserve-release-check"
  execution_role_arn = module.iam.lambda_execution_role_arn
  environment_variables = {
    API_BASE_URL = "https://${var.domain_name}/api"
  }
  tags = local.tags
}

module "lambda_notification_sender" {
  source = "../lambda"

  project_name       = var.project_name
  environment        = var.environment
  function_name      = "notification-sender"
  execution_role_arn = module.iam.lambda_execution_role_arn
  environment_variables = {
    API_BASE_URL = "https://${var.domain_name}/api"
  }
  tags = local.tags
}

module "events" {
  source = "../eventbridge"

  project_name = var.project_name
  environment  = var.environment

  monthly_fee_run_function_name       = module.lambda_monthly_fee_run.function_name
  monthly_fee_run_function_arn        = module.lambda_monthly_fee_run.function_arn
  reserve_release_check_function_name = module.lambda_reserve_release_check.function_name
  reserve_release_check_function_arn  = module.lambda_reserve_release_check.function_arn
  notification_sender_function_name   = module.lambda_notification_sender.function_name
  notification_sender_function_arn    = module.lambda_notification_sender.function_arn

  invoice_docs_bucket_id       = module.invoice_docs_bucket.bucket_name
  invoice_docs_bucket_arn      = module.invoice_docs_bucket.bucket_arn
  ocr_extraction_function_name = module.lambda_ocr_extraction.function_name
  ocr_extraction_function_arn  = module.lambda_ocr_extraction.function_arn

  tags = local.tags
}
