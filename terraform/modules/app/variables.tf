variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "availability_zones" {
  type = list(string)
}

variable "domain_name" {
  type = string
}

variable "acm_certificate_arn_regional" {
  type = string

  validation {
    condition     = length(var.acm_certificate_arn_regional) > 0
    error_message = "Issue/import an ACM cert in the target AWS region first (see terraform/README.md), then set acm_certificate_arn_regional."
  }
}

variable "acm_certificate_arn_cloudfront" {
  type    = string
  default = ""
}

variable "github_repository" {
  type = string
}

variable "api_container_image" {
  type    = string
  default = "public.ecr.aws/nginx/nginx:latest"
}

variable "web_container_image" {
  type    = string
  default = "public.ecr.aws/nginx/nginx:latest"
}

# --- Per-environment sizing/resilience knobs ---

variable "single_nat_gateway" {
  type    = bool
  default = true
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_multi_az" {
  type    = bool
  default = false
}

variable "db_deletion_protection" {
  type    = bool
  default = false
}

variable "api_desired_count" {
  type    = number
  default = 1
}

variable "web_desired_count" {
  type    = number
  default = 1
}

variable "api_cpu" {
  type    = number
  default = 512
}

variable "api_memory" {
  type    = number
  default = 1024
}

variable "web_cpu" {
  type    = number
  default = 512
}

variable "web_memory" {
  type    = number
  default = 1024
}
