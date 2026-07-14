/**
 * Thin client every Lambda handler uses to call the NestJS API's /internal/*
 * routes. Business logic lives in one place (the API); these handlers are
 * just triggers (S3 event / EventBridge schedule) that invoke it.
 *
 * In Phase 4, API_BASE_URL points at the internal ALB/CloudFront origin and
 * INTERNAL_API_KEY comes from Secrets Manager via the Lambda's Terraform
 * environment block — never hardcoded.
 */
export async function callInternalApi<T = unknown>(path: string, body?: unknown): Promise<T> {
  const apiBaseUrl = requireEnv('API_BASE_URL');
  const internalApiKey = requireEnv('INTERNAL_API_KEY');

  const res = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Api-Key': internalApiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Internal API call to ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
