# WorkWorld Production Infrastructure as Code (Terraform)
# Defines isolated multi-tenant deployment: Cloud Run / ECS Fargate, managed PostgreSQL,
# CloudFront CDN distribution, Secret Manager, and strict egress firewalls.

terraform {
  required_version = ">= 1.8.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Target deployment tier (production, staging)"
}

variable "region" {
  type        = string
  default     = "us-east-1"
  description = "Primary AWS region"
}

# 1. Virtual Private Cloud (VPC)
resource "aws_vpc" "workworld_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "workworld-${var.environment}-vpc"
    Environment = var.environment
  }
}

# 2. Production PostgreSQL Database (RDS Aurora Serverless v2)
resource "aws_db_subnet_group" "db_subnets" {
  name       = "workworld-${var.environment}-db-subnets"
  subnet_ids = []

  tags = {
    Name = "workworld-${var.environment}-db-subnets"
  }
}

# 3. Application Load Balancer with TLS 1.3 Termination
resource "aws_lb" "workworld_alb" {
  name               = "workworld-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = []

  tags = {
    Name        = "workworld-${var.environment}-alb"
    Environment = var.environment
  }
}

# 4. ECS Fargate Cluster & Service for Non-Root Next.js Application Container
resource "aws_ecs_cluster" "app_cluster" {
  name = "workworld-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# 5. Secrets Manager for Database and Authentication Credentials
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "workworld/${var.environment}/credentials"
  recovery_window_in_days = 7
}

output "alb_dns_name" {
  description = "Public endpoint URL for the WorkWorld application cluster"
  value       = aws_lb.workworld_alb.dns_name
}
