variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type        = list(string)
  description = "Private subnet ids for the DB subnet group."
}

variable "security_group_id" {
  type = string
}

variable "instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "allocated_storage" {
  type    = number
  default = 20
}

variable "engine_version" {
  type    = string
  default = "16.4"
}

variable "db_name" {
  type    = string
  default = "fueled_capital"
}

variable "master_username" {
  type    = string
  default = "fc_admin"
}

variable "backup_retention_days" {
  type    = number
  # AWS Free Tier accounts cap automatic backup retention below the general
  # default of 7 — 1 day keeps backups enabled without hitting that cap.
  # Raise this (e.g. via envs/staging or envs/prod tfvars) once off Free Tier.
  default = 1
}

variable "deletion_protection" {
  type        = bool
  default     = false
  description = "Set true for staging/prod."
}

variable "multi_az" {
  type        = bool
  default     = false
  description = "Set true for prod."
}

variable "tags" {
  type    = map(string)
  default = {}
}
