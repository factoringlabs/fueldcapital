output "monthly_fee_run_rule_arn" {
  value = aws_cloudwatch_event_rule.monthly_fee_run.arn
}

output "reserve_release_check_rule_arn" {
  value = aws_cloudwatch_event_rule.reserve_release_check.arn
}

output "notification_sender_rule_arn" {
  value = aws_cloudwatch_event_rule.notification_sender.arn
}
