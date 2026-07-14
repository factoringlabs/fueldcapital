# Build from the repo root: docker build -f apps/web/Dockerfile -t fueled-capital-web .

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/lambdas/package.json apps/lambdas/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/web apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace @fueled-capital/shared
RUN npm run build --workspace apps/web

# `output: 'standalone'` (next.config.mjs) traces only the files actually
# needed at runtime into .next/standalone — in an npm-workspaces monorepo
# that lands at apps/web/.next/standalone/apps/web/server.js. Static assets
# and /public aren't included automatically and are copied in separately.
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
RUN apk add --no-cache dumb-init && \
    addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /app/apps/web/public ./apps/web/public
USER app

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/web/server.js"]
