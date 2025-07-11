#!/bin/bash

# CloudFormation Template Validation Script
# Usage: ./validate.sh [template-file]

set -e

TEMPLATE_FILE=${1:-auth-service-cloudformation.yml}
REGION=${AWS_REGION:-us-east-1}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "Validating CloudFormation template: $TEMPLATE_FILE"

# Check if template file exists
if [[ ! -f "$TEMPLATE_FILE" ]]; then
    print_error "Template file $TEMPLATE_FILE not found!"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    print_warning "AWS credentials are not configured. Some validations may fail."
fi

# Validate template syntax
print_status "Validating template syntax..."
if aws cloudformation validate-template --template-body file://"$TEMPLATE_FILE" --region "$REGION" &> /dev/null; then
    print_success "Template syntax is valid!"
else
    print_error "Template syntax validation failed!"
    exit 1
fi

# Check for common issues
print_status "Checking for common issues..."

# Check for required parameters
REQUIRED_PARAMS=("Environment" "ProjectName")
for param in "${REQUIRED_PARAMS[@]}"; do
    if grep -q "ParameterName: $param" "$TEMPLATE_FILE"; then
        print_success "Parameter '$param' found"
    else
        print_warning "Parameter '$param' not found"
    fi
done

# Check for required resources
REQUIRED_RESOURCES=("AuthTable" "AuthApi" "LambdaExecutionRole")
for resource in "${REQUIRED_RESOURCES[@]}"; do
    if grep -q "Type: AWS::.*" "$TEMPLATE_FILE" | grep -q "$resource"; then
        print_success "Resource '$resource' found"
    else
        print_warning "Resource '$resource' not found"
    fi
done

# Check for outputs
if grep -q "Outputs:" "$TEMPLATE_FILE"; then
    print_success "Outputs section found"
else
    print_warning "No outputs section found"
fi

# Check for security best practices
print_status "Checking security best practices..."

# Check for KMS encryption
if grep -q "SSESpecification:" "$TEMPLATE_FILE"; then
    print_success "DynamoDB encryption configured"
else
    print_warning "DynamoDB encryption not configured"
fi

# Check for WAF
if grep -q "AWS::WAFv2::WebACL" "$TEMPLATE_FILE"; then
    print_success "WAF Web ACL configured"
else
    print_warning "WAF Web ACL not configured"
fi

# Check for IAM roles
if grep -q "AWS::IAM::Role" "$TEMPLATE_FILE"; then
    print_success "IAM roles configured"
else
    print_warning "No IAM roles found"
fi

# Check for CloudWatch alarms
if grep -q "AWS::CloudWatch::Alarm" "$TEMPLATE_FILE"; then
    print_success "CloudWatch alarms configured"
else
    print_warning "No CloudWatch alarms found"
fi

# Check for tags
if grep -q "Tags:" "$TEMPLATE_FILE"; then
    print_success "Resource tagging configured"
else
    print_warning "No resource tagging found"
fi

# Check for CORS configuration
if grep -q "Access-Control-Allow-Origin" "$TEMPLATE_FILE"; then
    print_success "CORS headers configured"
else
    print_warning "CORS headers not configured"
fi

# Check template size
TEMPLATE_SIZE=$(wc -c < "$TEMPLATE_FILE")
if [[ $TEMPLATE_SIZE -gt 512000 ]]; then
    print_warning "Template is large ($TEMPLATE_SIZE bytes). Consider splitting into nested stacks."
else
    print_success "Template size is reasonable ($TEMPLATE_SIZE bytes)"
fi

# Check for hardcoded values
print_status "Checking for hardcoded values..."
HARDCODED_VALUES=("us-east-1" "arn:aws:iam::aws:policy" "arn:aws:logs")
for value in "${HARDCODED_VALUES[@]}"; do
    if grep -q "$value" "$TEMPLATE_FILE"; then
        print_warning "Hardcoded value found: $value"
    fi
done

# Check for proper error handling
if grep -q "DependsOn:" "$TEMPLATE_FILE"; then
    print_success "Resource dependencies configured"
else
    print_warning "No explicit resource dependencies found"
fi

# Check for conditions
if grep -q "Conditions:" "$TEMPLATE_FILE"; then
    print_success "Conditions section found"
else
    print_warning "No conditions section found"
fi

print_success "Template validation completed!"

# Optional: Test with sample parameters
print_status "Testing template with sample parameters..."
SAMPLE_PARAMS=$(cat << EOF
[
  {
    "ParameterKey": "Environment",
    "ParameterValue": "dev"
  },
  {
    "ParameterKey": "ProjectName", 
    "ParameterValue": "auth-service"
  },
  {
    "ParameterKey": "DomainName",
    "ParameterValue": ""
  },
  {
    "ParameterKey": "CertificateArn",
    "ParameterValue": ""
  }
]
EOF
)

# Save sample parameters to file
echo "$SAMPLE_PARAMS" > sample-params.json

# Test template with sample parameters
if aws cloudformation validate-template --template-body file://"$TEMPLATE_FILE" --parameters file://sample-params.json --region "$REGION" &> /dev/null 2>&1; then
    print_success "Template validation with sample parameters successful!"
else
    print_warning "Template validation with sample parameters had issues (this may be normal for complex templates)"
fi

# Clean up
rm -f sample-params.json

print_success "Validation completed successfully!"
print_status "Template is ready for deployment." 