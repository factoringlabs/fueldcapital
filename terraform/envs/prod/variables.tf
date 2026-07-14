variable "project_name" {
  type    = string
  default = "fueledcapital"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b"]
}

variable "domain_name" {
  type        = string
  default     = "app.fueledcapital.example"
  description = "Placeholder — replace with the real production domain once one exists."
}

variable "acm_certificate_arn_regional" {
  type    = string
  default = ""
}

variable "acm_certificate_arn_cloudfront" {
  type    = string
  default = ""
}

variable "github_repository" {
  type    = string
  default = "factoringlabs/fueldcapital"
}

variable "api_container_image" {
  type    = string
  default = "public.ecr.aws/nginx/nginx:latest"
}

variable "web_container_image" {
  type    = string
  default = "public.ecr.aws/nginx/nginx:latest"
}
