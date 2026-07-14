#!/bin/sh
set -e

# Composes DATABASE_URL from the discrete DB_* env vars Terraform injects
# (DB_PASSWORD comes from the RDS-managed Secrets Manager secret; the rest
# are plain env vars) — see terraform/modules/app/main.tf. Local dev sets
# DATABASE_URL directly via .env instead, so this is a no-op there.
#
# RDS-generated passwords can contain URL-special characters (":", "#", "%",
# etc.) that break naive string interpolation into a connection string, so
# percent-encode the username/password first (via Node, since it's always
# present in this image — no extra dependency needed).
if [ -n "$DB_HOST" ] && [ -z "$DATABASE_URL" ]; then
  ENCODED_DB_USERNAME=$(node -e "process.stdout.write(encodeURIComponent(process.env.DB_USERNAME))")
  ENCODED_DB_PASSWORD=$(node -e "process.stdout.write(encodeURIComponent(process.env.DB_PASSWORD))")
  export DATABASE_URL="postgresql://${ENCODED_DB_USERNAME}:${ENCODED_DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
fi

# Deliberately does NOT run `prisma migrate deploy` here — with desired_count
# > 1, every replica would race to apply migrations on boot. Run migrations
# as a one-off step in the deploy workflow instead (see .github/workflows/deploy.yml).

exec "$@"
