output "user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "user_pool_arn" {
  value = aws_cognito_user_pool.this.arn
}

output "client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "client_secret" {
  value     = aws_cognito_user_pool_client.web.client_secret
  sensitive = true
}

output "domain" {
  value = aws_cognito_user_pool_domain.this.domain
}
