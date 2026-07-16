locals {
  name_prefix = "${var.project_name}-${var.environment}-${var.service_name}"
}

resource "aws_ecr_repository" "this" {
  name                 = local.name_prefix
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.tags, { Name = local.name_prefix })
}

resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last 20 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 20
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${local.name_prefix}"
  retention_in_days = var.environment == "prod" ? 90 : 14
  tags              = var.tags
}

# --- ALB ---

resource "aws_lb" "this" {
  name               = local.name_prefix
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids
  tags               = merge(var.tags, { Name = local.name_prefix })
}

resource "aws_lb_target_group" "this" {
  name        = local.name_prefix
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = var.health_check_path
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }

  tags = var.tags
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# --- ECS task + service ---

resource "aws_ecs_task_definition" "this" {
  family                   = local.name_prefix
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn             = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = var.service_name
      image     = var.container_image
      essential = true
      portMappings = [
        { containerPort = var.container_port, protocol = "tcp" }
      ]
      environment = [for k, v in var.environment_variables : { name = k, value = v }]
      secrets     = [for k, v in var.secrets : { name = k, valueFrom = v }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = var.service_name
        }
      }
    }
  ])

  tags = var.tags

  # The deploy workflow registers a new revision (new image tag) and calls
  # ecs update-service directly — Terraform shouldn't fight that on every
  # `plan` by trying to revert to whatever image was here at last apply.
  lifecycle {
    ignore_changes = [container_definitions]
  }
}

data "aws_region" "current" {}

resource "aws_ecs_service" "this" {
  name            = local.name_prefix
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [var.ecs_service_security_group_id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name    = var.service_name
    container_port    = var.container_port
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent          = 200

  tags = var.tags

  depends_on = [aws_lb_listener.https]

  # The task_definition resource above freezes its container_definitions at
  # whatever `terraform apply` last created (see its own ignore_changes) since
  # the deploy workflow registers new revisions directly. Without this, this
  # service resource would still try to swing back to that frozen (stale)
  # revision on every unrelated `terraform apply`, undoing every real deploy.
  lifecycle {
    ignore_changes = [task_definition]
  }
}

resource "aws_appautoscaling_target" "this" {
  max_capacity       = var.environment == "prod" ? 10 : 2
  min_capacity       = var.desired_count
  resource_id        = "service/${var.cluster_id}/${aws_ecs_service.this.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${local.name_prefix}-cpu-target-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.this.resource_id
  scalable_dimension = aws_appautoscaling_target.this.scalable_dimension
  service_namespace  = aws_appautoscaling_target.this.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 60
    scale_in_cooldown  = 120
    scale_out_cooldown = 60
  }
}
