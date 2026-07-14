variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "service_name" {
  type        = string
  description = "e.g. \"api\" or \"web\"."
}

variable "cluster_id" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "alb_security_group_id" {
  type = string
}

variable "ecs_service_security_group_id" {
  type = string
}

variable "task_execution_role_arn" {
  type = string
}

variable "task_role_arn" {
  type = string
}

variable "container_port" {
  type = number
}

variable "health_check_path" {
  type    = string
  default = "/health"
}

variable "cpu" {
  type    = number
  default = 512
}

variable "memory" {
  type    = number
  default = 1024
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "container_image" {
  type        = string
  description = "Full image URI:tag. Deploy workflow updates this via a new task definition revision, not a Terraform apply, on every app deploy."
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}

variable "secrets" {
  type        = map(string)
  default     = {}
  description = "Env var name -> Secrets Manager ARN, injected at container start."
}

variable "acm_certificate_arn" {
  type        = string
  description = "ACM cert for the ALB HTTPS listener (must be issued in this region for an internal/regional ALB)."
}

variable "tags" {
  type    = map(string)
  default = {}
}
