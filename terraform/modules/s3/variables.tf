variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "bucket_purpose" {
  type        = string
  description = "e.g. \"invoice-docs\" or \"kyb-docs\" — becomes part of the bucket name."
}

variable "allowed_origins" {
  type        = list(string)
  description = "Web app origin(s) allowed to PUT via presigned URLs (CORS)."
}

variable "tags" {
  type    = map(string)
  default = {}
}
