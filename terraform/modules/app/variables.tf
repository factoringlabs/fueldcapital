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

# The web app doesn't have a real Cognito Hosted UI login flow yet (it only
# knows how to do the dev-mode x-dev-user-id sign-in). Passing a real Cognito
# pool id into the API disables that dev bypass (see CognitoAuthGuard), so
# environments still relying on the dev sign-in page must set this to false
# until Cognito login is actually built into apps/web.
variable "cognito_auth_enabled" {
  type    = bool
  default = true
}

# When set, the API uses Claude to read uploaded invoices and pre-fill fields
# for the Broker to confirm (see apps/api/src/extraction/claude-ocr.provider.ts).
# Left blank, the API falls back to the no-op stub provider. Never checked in —
# set via a local terraform.tfvars (gitignored) or CI secret.
variable "anthropic_api_key" {
  type      = string
  default   = ""
  sensitive = true
}
