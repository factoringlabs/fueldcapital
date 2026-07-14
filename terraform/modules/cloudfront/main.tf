locals {
  name_prefix    = "${var.project_name}-${var.environment}"
  web_origin_id  = "${local.name_prefix}-web"
  api_origin_id  = "${local.name_prefix}-api"
  use_custom_cert = var.acm_certificate_arn != null
}

resource "aws_cloudfront_distribution" "this" {
  enabled         = true
  comment         = "${local.name_prefix} — fronts the Next.js web app and the /api/* NestJS backend"
  price_class     = var.price_class
  aliases         = var.domain_aliases
  http_version    = "http2and3"

  origin {
    origin_id   = local.web_origin_id
    domain_name = var.web_origin_domain_name

    custom_origin_config {
      origin_protocol_policy = "https-only"
      http_port               = 80
      https_port               = 443
      origin_ssl_protocols     = ["TLSv1.2"]
    }
  }

  origin {
    origin_id   = local.api_origin_id
    domain_name = var.api_origin_domain_name

    custom_origin_config {
      origin_protocol_policy = "https-only"
      http_port               = 80
      https_port               = 443
      origin_ssl_protocols     = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = local.web_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods         = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]

    # Next.js Server Actions / SSR responses vary per request — do not cache by default.
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
  }

  ordered_cache_behavior {
    path_pattern            = "/api/*"
    target_origin_id        = local.api_origin_id
    viewer_protocol_policy  = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods            = ["GET", "HEAD"]

    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = !local.use_custom_cert
    acm_certificate_arn            = local.use_custom_cert ? var.acm_certificate_arn : null
    ssl_support_method             = local.use_custom_cert ? "sni-only" : null
    minimum_protocol_version       = local.use_custom_cert ? "TLSv1.2_2021" : null
  }

  tags = merge(var.tags, { Name = local.name_prefix })
}

# AWS-managed policies — no need to author custom cache/origin-request policies.
data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewer"
}
