locals {
  name_prefix = "${var.project_name}-${var.environment}-${var.function_name}"
}

# Terraform provisions the function shell with a trivial placeholder package;
# the deploy workflow ships the real build (apps/lambdas/dist/<function_name>)
# via `aws lambda update-function-code` immediately after, the same pattern
# used for the ECS task definition's container image.
data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/.placeholder-${var.function_name}.zip"

  source {
    content  = "exports.handler = async () => ({ statusCode: 200, body: 'placeholder — awaiting first deploy' });"
    filename = "handler.js"
  }
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${local.name_prefix}"
  retention_in_days = var.environment == "prod" ? 90 : 14
  tags              = var.tags
}

resource "aws_lambda_function" "this" {
  function_name = local.name_prefix
  role          = var.execution_role_arn
  handler       = var.handler
  runtime       = "nodejs20.x"
  timeout       = var.timeout
  memory_size   = var.memory_size

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  environment {
    variables = var.environment_variables
  }

  tags = merge(var.tags, { Name = local.name_prefix })

  depends_on = [aws_cloudwatch_log_group.this]

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}
