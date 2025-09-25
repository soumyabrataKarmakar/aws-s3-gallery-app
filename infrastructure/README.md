# AWS S3 Gallery Infrastructure

This directory contains the Terraform configuration for deploying the AWS infrastructure required for the AWS S3 Gallery mobile application.

## Architecture

The infrastructure includes:

- **AWS Cognito User Pool** - User authentication and management
- **AWS Cognito Identity Pool** - Temporary AWS credentials for authenticated users
- **AWS S3 Bucket** - Media file storage with proper security configurations
- **IAM Roles & Policies** - Secure access controls for S3 operations

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** installed (version >= 1.0)
3. **AWS account** with permissions to create Cognito, S3, and IAM resources

## Deployment

1. **Review the configuration**:
   ```bash
   cd infrastructure
   terraform plan
   ```

2. **Deploy the infrastructure**:
   ```bash
   ./deploy.sh
   ```

3. **Update your application configuration**:
   After deployment, update your `.env` file with the output values:
   ```bash
   AWS_USER_POOL_ID=<user_pool_id>
   AWS_USER_POOL_CLIENT_ID=<user_pool_client_id>
   AWS_IDENTITY_POOL_ID=<identity_pool_id>
   AWS_S3_BUCKET=<s3_bucket_name>
   AWS_REGION=<aws_region>
   ```

## Resources Created

### Cognito User Pool
- **Purpose**: User authentication and password management
- **Features**:
  - Email-based authentication
  - Strong password policy
  - Account recovery via email
  - Secure token management

### Cognito Identity Pool
- **Purpose**: Provides temporary AWS credentials to authenticated users
- **Features**:
  - Federated with User Pool
  - Role-based access control
  - Secure credential vending

### S3 Bucket
- **Purpose**: Secure media file storage
- **Features**:
  - Server-side encryption
  - Versioning enabled
  - Public access blocked
  - CORS configured for mobile app access

### IAM Roles & Policies
- **Purpose**: Secure access control for S3 operations
- **Features**:
  - User-specific folder access (`private/{user-id}/`)
  - Read access to protected shared content
  - Principle of least privilege

## Security Considerations

- All resources follow AWS security best practices
- S3 bucket blocks public access by default
- IAM policies restrict access to user-specific folders
- Cognito enforces strong password requirements
- All data encrypted at rest and in transit

## Cost Optimization

- S3 bucket configured for standard storage class
- Cognito pricing based on monthly active users
- No unnecessary features enabled to minimize costs

## Cleanup

To destroy all resources:
```bash
cd infrastructure
terraform destroy
```

**Warning**: This will permanently delete all data in the S3 bucket and cannot be undone.