variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "web_origin_domain_name" {
  type        = string
  description = "Web app ALB DNS name (default behavior)."
}

variable "api_origin_domain_name" {
  type        = string
  description = "API ALB DNS name (/api/* behavior)."
}

variable "domain_aliases" {
  type        = list(string)
  default     = []
  description = "Custom domain(s), e.g. [\"dev.fueledcapital.com\"]. Leave empty to use the default *.cloudfront.net domain."
}

variable "acm_certificate_arn" {
  type        = string
  description = "Must be an ACM cert in us-east-1 — CloudFront requirement regardless of where everything else runs."
  default     = null
}

variable "price_class" {
  type    = string
  default = "PriceClass_100"
}

variable "tags" {
  type    = map(string)
  default = {}
}
