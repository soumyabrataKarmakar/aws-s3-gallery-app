# Terraform configuration
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "aws-s3-gallery-app"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "development"
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Outputs
output "aws_region" {
  description = "AWS region"
  value       = data.aws_region.current.name
}

output "account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "configuration_summary" {
  description = "Summary of AWS resources configuration"
  value = {
    user_pool_id        = aws_cognito_user_pool.gallery_user_pool.id
    user_pool_client_id = aws_cognito_user_pool_client.gallery_client.id
    identity_pool_id    = aws_cognito_identity_pool.gallery_identity_pool.id
    s3_bucket_name      = aws_s3_bucket.gallery_bucket.id
    aws_region          = data.aws_region.current.name
  }
}