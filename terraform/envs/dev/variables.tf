variable "project_name" {
  type    = string
  default = "fueledcapital"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b"]
}

# Prerequisite (manual, one-time): register/delegate this domain and issue
# ACM certs for it before running `terraform apply` — see terraform/README.md.
variable "domain_name" {
  type        = string
  default     = "dev.fueledcapital.example"
  description = "Placeholder — replace with the real dev subdomain once one exists."
}

variable "acm_certificate_arn_regional" {
  type        = string
  default     = ""
  description = "ACM cert (same region as aws_region) for the ALB HTTPS listeners. Required before first apply."
}

variable "acm_certificate_arn_cloudfront" {
  type        = string
  default     = ""
  description = "ACM cert in us-east-1 for CloudFront. Required before first apply. Leave blank to use the default *.cloudfront.net cert with no custom domain."
}

variable "github_repository" {
  type    = string
  default = "factoringlabs/fueldcapital"
}

variable "api_container_image" {
  type        = string
  default     = "public.ecr.aws/nginx/nginx:latest"
  description = "ECR image URI:tag for the API service. Defaults to a placeholder so the first `terraform apply` doesn't depend on an image already being pushed — the deploy workflow's first run replaces it (task definition changes are ignored by Terraform after initial creation)."
}

variable "web_container_image" {
  type        = string
  default     = "public.ecr.aws/nginx/nginx:latest"
  description = "ECR image URI:tag for the web service. Same placeholder pattern as api_container_image."
}
