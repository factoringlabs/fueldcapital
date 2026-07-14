variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "s3_bucket_arns" {
  type        = list(string)
  description = "invoice-docs and kyb-docs bucket ARNs the ECS task role can read/write objects in."
}

variable "db_secret_arn" {
  type        = string
  description = "Secrets Manager ARN of the RDS-managed master password, readable by the ECS task execution role."
}

variable "internal_api_key_secret_arn" {
  type        = string
  description = "Secrets Manager ARN of the INTERNAL_API_KEY shared secret, readable by ECS tasks and Lambdas."
}

variable "ecr_repository_arns" {
  type        = list(string)
  description = "ECR repo ARNs the GitHub Actions deploy role may push images to."
}

variable "ecs_cluster_arn" {
  type = string
}

variable "lambda_function_arns" {
  type        = list(string)
  description = "Lambda ARNs the GitHub Actions deploy role may update code for."
}

variable "github_repository" {
  type        = string
  description = "org/repo, e.g. \"factoringlabs/fueldcapital\"."
}

variable "github_deploy_ref" {
  type        = string
  default     = "refs/heads/main"
  description = "Branch/ref allowed to assume the deploy role (app image build+deploy)."
}

variable "tags" {
  type    = map(string)
  default = {}
}
