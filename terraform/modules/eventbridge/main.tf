locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# --- Monthly fee run: 00:05 UTC on the 1st of each month ---

resource "aws_cloudwatch_event_rule" "monthly_fee_run" {
  name                = "${local.name_prefix}-monthly-fee-run"
  schedule_expression = "cron(5 0 1 * ? *)"
  tags                = var.tags
}

resource "aws_cloudwatch_event_target" "monthly_fee_run" {
  rule = aws_cloudwatch_event_rule.monthly_fee_run.name
  arn  = var.monthly_fee_run_function_arn
}

resource "aws_lambda_permission" "monthly_fee_run" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.monthly_fee_run_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.monthly_fee_run.arn
}

# --- Reserve release check: daily at 13:00 UTC ---

resource "aws_cloudwatch_event_rule" "reserve_release_check" {
  name                = "${local.name_prefix}-reserve-release-check"
  schedule_expression = "cron(0 13 * * ? *)"
  tags                = var.tags
}

resource "aws_cloudwatch_event_target" "reserve_release_check" {
  rule = aws_cloudwatch_event_rule.reserve_release_check.name
  arn  = var.reserve_release_check_function_arn
}

resource "aws_lambda_permission" "reserve_release_check" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.reserve_release_check_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.reserve_release_check.arn
}

# --- Notification sender: every 5 minutes ---

resource "aws_cloudwatch_event_rule" "notification_sender" {
  name                = "${local.name_prefix}-notification-sender"
  schedule_expression = "rate(5 minutes)"
  tags                = var.tags
}

resource "aws_cloudwatch_event_target" "notification_sender" {
  rule = aws_cloudwatch_event_rule.notification_sender.name
  arn  = var.notification_sender_function_arn
}

resource "aws_lambda_permission" "notification_sender" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.notification_sender_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.notification_sender.arn
}

# --- OCR extraction trigger: S3 ObjectCreated on the invoice-docs bucket ---
# (Native S3 event notifications rather than routing through EventBridge —
# simpler for a single consumer.)

resource "aws_lambda_permission" "ocr_extraction_s3" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = var.ocr_extraction_function_name
  principal     = "s3.amazonaws.com"
  source_arn    = var.invoice_docs_bucket_arn
}

resource "aws_s3_bucket_notification" "invoice_docs_uploaded" {
  bucket = var.invoice_docs_bucket_id

  lambda_function {
    lambda_function_arn = var.ocr_extraction_function_arn
    events               = ["s3:ObjectCreated:*"]
    filter_prefix        = "invoices/"
  }

  depends_on = [aws_lambda_permission.ocr_extraction_s3]
}
