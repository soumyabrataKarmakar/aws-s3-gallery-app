# S3 Bucket for media storage
resource "aws_s3_bucket" "gallery_bucket" {
  bucket = "aws-s3-gallery-app-${random_string.bucket_suffix.result}"

  tags = {
    Name        = "AWS S3 Gallery Bucket"
    Environment = "development"
    Project     = "aws-s3-gallery-app"
  }
}

# Random suffix for bucket name to ensure uniqueness
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# S3 Bucket versioning
resource "aws_s3_bucket_versioning" "gallery_bucket_versioning" {
  bucket = aws_s3_bucket.gallery_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "gallery_bucket_encryption" {
  bucket = aws_s3_bucket.gallery_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket public access block
resource "aws_s3_bucket_public_access_block" "gallery_bucket_pab" {
  bucket = aws_s3_bucket.gallery_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket CORS configuration
resource "aws_s3_bucket_cors_configuration" "gallery_bucket_cors" {
  bucket = aws_s3_bucket.gallery_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag", "x-amz-meta-custom-header"]
    max_age_seconds = 3000
  }
}

# IAM Role for authenticated users
resource "aws_iam_role" "cognito_authenticated_role" {
  name = "Cognito_aws_s3_gallery_Auth_Role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.gallery_identity_pool.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "Cognito Authenticated Role"
    Environment = "development"
    Project     = "aws-s3-gallery-app"
  }
}

# IAM Policy for S3 access
resource "aws_iam_policy" "s3_gallery_policy" {
  name        = "S3GalleryPolicy"
  description = "Policy for S3 gallery operations"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.gallery_bucket.arn}/private/$${cognito-identity.amazonaws.com:sub}/*",
          "${aws_s3_bucket.gallery_bucket.arn}/protected/$${cognito-identity.amazonaws.com:sub}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = [
          "${aws_s3_bucket.gallery_bucket.arn}/protected/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.gallery_bucket.arn
        Condition = {
          StringLike = {
            "s3:prefix" = [
              "private/$${cognito-identity.amazonaws.com:sub}/*",
              "protected/$${cognito-identity.amazonaws.com:sub}/*",
              "protected/*"
            ]
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketLocation",
          "s3:ListAllMyBuckets"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "cognito_authenticated_role_policy" {
  role       = aws_iam_role.cognito_authenticated_role.name
  policy_arn = aws_iam_policy.s3_gallery_policy.arn
}

# Identity Pool Role Attachment
resource "aws_cognito_identity_pool_roles_attachment" "gallery_identity_pool_roles" {
  identity_pool_id = aws_cognito_identity_pool.gallery_identity_pool.id

  roles = {
    authenticated = aws_iam_role.cognito_authenticated_role.arn
  }
}

# Outputs
output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.gallery_bucket.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.gallery_bucket.arn
}

output "s3_bucket_region" {
  description = "Region of the S3 bucket"
  value       = aws_s3_bucket.gallery_bucket.region
}

output "cognito_authenticated_role_arn" {
  description = "ARN of the Cognito authenticated role"
  value       = aws_iam_role.cognito_authenticated_role.arn
}