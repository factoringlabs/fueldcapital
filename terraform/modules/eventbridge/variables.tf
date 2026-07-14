variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

# --- Scheduled Lambdas (EventBridge rules) ---

variable "monthly_fee_run_function_name" {
  type = string
}
variable "monthly_fee_run_function_arn" {
  type = string
}

variable "reserve_release_check_function_name" {
  type = string
}
variable "reserve_release_check_function_arn" {
  type = string
}

variable "notification_sender_function_name" {
  type = string
}
variable "notification_sender_function_arn" {
  type = string
}

# --- S3-triggered Lambda (document upload) ---

variable "invoice_docs_bucket_id" {
  type = string
}
variable "invoice_docs_bucket_arn" {
  type = string
}
variable "ocr_extraction_function_name" {
  type = string
}
variable "ocr_extraction_function_arn" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
