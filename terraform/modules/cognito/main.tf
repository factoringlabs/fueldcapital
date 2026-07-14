locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "aws_cognito_user_pool" "this" {
  name = "${local.name_prefix}-users"

  # Admin creates Broker/Machinery Company logins (see AccountsModule.UsersController) —
  # self-service sign-up is not part of onboarding, so it stays disabled.
  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  username_attributes     = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  tags = merge(var.tags, { Name = "${local.name_prefix}-user-pool" })
}

# One group per portal role — matches UserRole in packages/shared exactly.
resource "aws_cognito_user_group" "admin" {
  name         = "ADMIN"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Fueled Capital / Hankoms staff"
}

resource "aws_cognito_user_group" "broker" {
  name         = "BROKER"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Fuel broker/distributor users"
}

resource "aws_cognito_user_group" "machinery_company" {
  name         = "MACHINERY_COMPANY"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Machinery/construction company (debtor) users"
}

resource "aws_cognito_user_pool_domain" "this" {
  domain       = "${local.name_prefix}-auth"
  user_pool_id = aws_cognito_user_pool.this.id
}

# Single confidential client for the Next.js web app (all three portals share
# one app per the architecture decision — no separate mobile/native client yet).
resource "aws_cognito_user_pool_client" "web" {
  name         = "${local.name_prefix}-web"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret                     = true
  allowed_oauth_flows                 = ["code"]
  allowed_oauth_scopes                = ["openid", "email", "profile"]
  allowed_oauth_flows_user_pool_client = true
  callback_urls                       = var.callback_urls
  logout_urls                         = var.logout_urls
  supported_identity_providers        = ["COGNITO"]

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  prevent_user_existence_errors = "ENABLED"
}
