# AWS Cognito User Pool Configuration
resource "aws_cognito_user_pool" "gallery_user_pool" {
  name = "aws-s3-gallery-user-pool"

  # Password policy
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # User attributes
  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "email"
    required                 = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  # Auto verification
  auto_verified_attributes = ["email"]

  # Username configuration
  username_attributes = ["email"]

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Admin create user config
  admin_create_user_config {
    allow_admin_create_user_only = false

    invite_message_template {
      email_message = "Your username is {username} and temporary password is {####}. Please sign in and change your password."
      email_subject = "AWS S3 Gallery - Your temporary password"
    }
  }

  # Verification message templates
  verification_message_template {
    default_email_option  = "CONFIRM_WITH_CODE"
    email_message        = "Your verification code is {####}"
    email_subject        = "AWS S3 Gallery - Verification Code"
  }

  # Device configuration
  device_configuration {
    challenge_required_on_new_device      = false
    device_only_remembered_on_user_prompt = false
  }

  tags = {
    Name        = "AWS S3 Gallery User Pool"
    Environment = "development"
    Project     = "aws-s3-gallery-app"
  }
}

# User Pool Client
resource "aws_cognito_user_pool_client" "gallery_client" {
  name         = "aws-s3-gallery-client"
  user_pool_id = aws_cognito_user_pool.gallery_user_pool.id

  # Client settings
  generate_secret                      = false
  prevent_user_existence_errors        = "ENABLED"
  enable_token_revocation             = true
  enable_propagate_additional_user_context_data = false

  # OAuth settings
  allowed_oauth_flows                  = ["implicit", "code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile", "aws.cognito.signin.user.admin"]

  # Supported identity providers
  supported_identity_providers = ["COGNITO"]

  # Token validity
  access_token_validity                = 60    # 1 hour
  id_token_validity                   = 60    # 1 hour
  refresh_token_validity              = 30    # 30 days
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Read and write attributes
  read_attributes  = ["email", "email_verified"]
  write_attributes = ["email"]

  # Explicit auth flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]
}

# Identity Pool
resource "aws_cognito_identity_pool" "gallery_identity_pool" {
  identity_pool_name               = "aws_s3_gallery_identity_pool"
  allow_unauthenticated_identities = false
  allow_classic_flow               = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.gallery_client.id
    provider_name           = aws_cognito_user_pool.gallery_user_pool.endpoint
    server_side_token_check = false
  }

  tags = {
    Name        = "AWS S3 Gallery Identity Pool"
    Environment = "development"
    Project     = "aws-s3-gallery-app"
  }
}

# Outputs
output "user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.gallery_user_pool.id
}

output "user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.gallery_client.id
}

output "identity_pool_id" {
  description = "ID of the Cognito Identity Pool"
  value       = aws_cognito_identity_pool.gallery_identity_pool.id
}

output "user_pool_endpoint" {
  description = "Endpoint of the Cognito User Pool"
  value       = aws_cognito_user_pool.gallery_user_pool.endpoint
}