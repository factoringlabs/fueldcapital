#!/bin/sh
set -e

# Composes DATABASE_URL from the discrete DB_* env vars Terraform injects
# (DB_PASSWORD comes from the RDS-managed Secrets Manager secret; the rest
# are plain env vars) — see terraform/modules/app/main.tf. Local dev sets
# DATABASE_URL directly via .env instead, so this is a no-op there.
if [ -n "$DB_HOST" ] && [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
fi

# Deliberately does NOT run `prisma migrate deploy` here — with desired_count
# > 1, every replica would race to apply migrations on boot. Run migrations
# as a one-off step in the deploy workflow instead (see .github/workflows/deploy.yml).

exec "$@"
