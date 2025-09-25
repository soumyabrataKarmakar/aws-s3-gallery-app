#!/bin/bash

# AWS S3 Gallery App Infrastructure Deployment Script
set -e

echo "🚀 Starting AWS S3 Gallery App infrastructure deployment..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform not installed. Please install Terraform first."
    exit 1
fi

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📋 Current AWS identity:"
aws sts get-caller-identity

# Initialize Terraform
echo "🔧 Initializing Terraform..."
terraform init

# Validate Terraform configuration
echo "✅ Validating Terraform configuration..."
terraform validate

# Plan the deployment
echo "📋 Planning Terraform deployment..."
terraform plan -out=tfplan

# Ask for confirmation
echo "🤔 Do you want to apply this configuration? (y/N)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "🚀 Applying Terraform configuration..."
    terraform apply tfplan

    # Get outputs
    echo "📝 Getting Terraform outputs..."
    terraform output -json > ../terraform-outputs.json

    # Display configuration summary
    echo "✅ Infrastructure deployed successfully!"
    echo "📋 Configuration Summary:"
    terraform output configuration_summary

    echo ""
    echo "🔧 Next steps:"
    echo "1. Update your .env file with the output values"
    echo "2. Run 'npm test' to verify the configuration"
    echo "3. Start developing your authentication features"

else
    echo "❌ Deployment cancelled."
    rm -f tfplan
    exit 0
fi

echo "🎉 Deployment complete!"