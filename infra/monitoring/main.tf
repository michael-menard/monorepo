# Terraform configuration for Knowledge Base PostgreSQL Monitoring
# KNOW-016: PostgreSQL Monitoring Infrastructure

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration - uncomment and configure for remote state
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "monitoring/terraform.tfstate"
  #   region         = "us-west-2"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "knowledge-base"
      Component   = "monitoring"
      Environment = var.environment
      ManagedBy   = "terraform"
      Story       = "KNOW-016"
    }
  }
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Data source for current region
data "aws_region" "current" {}
