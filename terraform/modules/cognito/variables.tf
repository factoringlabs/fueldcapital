variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "callback_urls" {
  type        = list(string)
  description = "Allowed OAuth redirect URLs for the web app (e.g. https://dev.fueledcapital.com/api/auth/callback)."
}

variable "logout_urls" {
  type = list(string)
}

variable "tags" {
  type    = map(string)
  default = {}
}
