# Build from the repo root: docker build -f apps/api/Dockerfile -t fueled-capital-api .
# (npm workspaces needs the whole monorepo's package.json files present for `npm ci`.)

FROM node:20-alpine AS base
WORKDIR /app
# Prisma's engine binaries need OpenSSL to be present at both `generate` time
# (to pick the right musl/OpenSSL target) and at runtime (to actually run) —
# Alpine doesn't include it by default, unlike Debian-based images.
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/lambdas/package.json apps/lambdas/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace @fueled-capital/shared
RUN npm run prisma:generate --workspace apps/api
RUN npm run build --workspace apps/api
# Pre-compiled to plain JS rather than run via `ts-node` at runtime — running
# a .ts file directly through the ts-node CLI inside this image failed with
# "Unknown file extension .ts" (Node 20 in this environment wasn't picking up
# ts-node's loader hook). Compiling ahead of time sidesteps that entirely.
RUN npm run build:seed --workspace apps/api

FROM base AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init
# node_modules here still includes devDependencies (notably the `prisma` CLI)
# deliberately — the deploy workflow runs `prisma migrate deploy` as a one-off
# ECS task using this same image, overriding the container command.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/dist-scripts ./apps/api/dist-scripts
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && \
    addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 4000
ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint.sh"]
CMD ["node", "apps/api/dist/src/main.js"]
