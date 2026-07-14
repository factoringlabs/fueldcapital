# Lambda handlers

Structural scaffolds for the background jobs called out in the tech stack — not deployed yet.
Each handler is a thin trigger that calls one of the NestJS API's `/internal/*` routes; all
business logic lives in the API (`apps/api/src/internal`), not here, so there's one source of
truth regardless of which compute layer calls it.

| Handler | Trigger (Phase 4) | Calls |
|---|---|---|
| `ocr-extraction-trigger` | S3 `ObjectCreated` on the invoice-docs bucket | `POST /internal/invoices/:id/extract` |
| `monthly-fee-run` | EventBridge schedule, start of month | `POST /internal/fee-runs` |
| `reserve-release-check` | EventBridge schedule, daily | `POST /internal/reserve-release-check` |
| `notification-sender` | EventBridge schedule, every few minutes | `POST /internal/notifications/process-pending` |

## Local testing

```bash
cp .env.example .env   # point API_BASE_URL at your running apps/api, set INTERNAL_API_KEY to match
npx ts-node -e "require('./src/monthly-fee-run/handler').handler({} as any, {} as any, () => {})"
```

## Phase 4 (not yet built)

- Package each handler with `esbuild`/`webpack` into a zip (or container image) per the
  `lambda` Terraform module.
- Wire `ocr-extraction-trigger` to an S3 event notification on the invoice-docs bucket.
- Wire the other three to EventBridge scheduled rules.
- `INTERNAL_API_KEY` comes from Secrets Manager, injected as a Lambda environment variable by
  Terraform — never hardcoded or committed.
