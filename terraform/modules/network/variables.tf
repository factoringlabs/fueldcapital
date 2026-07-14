variable "project_name" {
  type        = string
  description = "Short project prefix used in resource names (e.g. \"fueledcapital\")."
}

variable "environment" {
  type        = string
  description = "dev, staging, or prod."
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "Exactly 2 AZs for this region."
}

variable "single_nat_gateway" {
  type        = bool
  default     = true
  description = "One NAT gateway (cheaper, single point of failure) vs one per AZ. Use false in prod."
}

variable "tags" {
  type    = map(string)
  default = {}
}
