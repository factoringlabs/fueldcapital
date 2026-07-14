locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "aws_db_subnet_group" "this" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = var.subnet_ids
  tags       = merge(var.tags, { Name = "${local.name_prefix}-db-subnet-group" })
}

resource "aws_db_parameter_group" "this" {
  name_prefix = "${local.name_prefix}-pg16-"
  family      = "postgres16"
  tags        = var.tags
  lifecycle { create_before_destroy = true }
}

# Master password is generated and stored by RDS directly in Secrets Manager —
# Terraform state never contains the plaintext credential.
resource "aws_db_instance" "this" {
  identifier     = "${local.name_prefix}-db"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  storage_type           = "gp3"
  storage_encrypted      = true

  db_name  = var.db_name
  username = var.master_username
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.security_group_id]
  parameter_group_name   = aws_db_parameter_group.this.name

  multi_az                = var.multi_az
  backup_retention_period  = var.backup_retention_days
  deletion_protection      = var.deletion_protection
  skip_final_snapshot      = !var.deletion_protection
  final_snapshot_identifier = var.deletion_protection ? "${local.name_prefix}-db-final" : null

  auto_minor_version_upgrade = true
  copy_tags_to_snapshot      = true

  tags = merge(var.tags, { Name = "${local.name_prefix}-db" })
}
