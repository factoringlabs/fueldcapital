variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "function_name" {
  type        = string
  description = "e.g. \"ocr-extraction-trigger\" — matches the apps/lambdas/src subdirectory."
}

variable "handler" {
  type    = string
  default = "handler.handler"
}

variable "execution_role_arn" {
  type = string
}

variable "environment_variables" {
  type        = map(string)
  default     = {}
  description = "Plain (non-secret) env vars. Callers should source INTERNAL_API_KEY from a data.aws_secretsmanager_secret_version lookup, not a hardcoded tfvar, to keep it out of version control."
}

variable "timeout" {
  type    = number
  default = 30
}

variable "memory_size" {
  type    = number
  default = 256
}

variable "tags" {
  type    = map(string)
  default = {}
}
