# Fueled Capital — Invoice Purchase Portal

Fueled Capital (operated by FactoringLabs Inc.) buys fuel invoices from Brokers and collects
payment from the Machinery Companies that owe on them. This repo is a fresh, production-track
build: NestJS API + Next.js portals + Postgres, scoped to **Invoice Purchase only** (no Credit
Line product).

The full state machines, schema rationale, and Terraform layout were reviewed and approved with
the product owner before scaffolding. Key conventions from that review are repeated here:

## Credit exposure convention

There is **one** credit limit in this system: a sub-limit per **Machinery Company** (the debtor).
There is intentionally **no Broker-level facility limit** — Brokers have no cap on outstanding
funded volume.

Exposure is always tracked by the invoice's **full `totalAmount`**, not the advance amount:
- On funding (`FUNDED`), `MachineryCompanyCreditLimit.currentUsed` increases by `totalAmount`.
- On settlement, chargeback, or write-off, it decreases by the same `totalAmount`.
- The advance amount is cash exposure only; it never drives the limit.

Every change is logged in `CreditLimitChangeLog` (append-only, idempotent) so the cached
`currentUsed` counter can always be reconstructed/audited.

## Repo layout

```
apps/api        NestJS backend (Prisma/Postgres, Cognito auth, invoice/onboarding state machines, ledger)
apps/web        Next.js portals (Admin / Broker / Machinery Company), App Router
apps/lambdas    Structural scaffolds for background jobs — see apps/lambdas/README.md
packages/shared Enums + state-machine transition tables shared by both apps
terraform/      AWS infra (network, database, cognito, s3, iam, ecs-service, cloudfront,
                lambda, eventbridge) — see terraform/README.md before touching any of it
.github/        CI + Terraform plan/apply + app deploy workflows — see .github/workflows/README.md
```

## Local development

Requires Node 20+, npm 10+, and a local Postgres instance (Docker not required, but easiest):

```bash
docker run --name fc-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fueled_capital -p 5432:5432 -d postgres:16

npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

npm run prisma:migrate --workspace apps/api   # creates tables
npm run seed --workspace apps/api             # seeds one Admin/Broker/Machinery Company

npm run dev:api    # http://localhost:4000
npm run dev:web    # http://localhost:3000
```

Cognito isn't wired up yet (that's Phase 4 Terraform work). Until `COGNITO_USER_POOL_ID` is set,
the API accepts an `x-dev-user-id` header instead of a verified JWT (see
`apps/api/src/auth/cognito-auth.guard.ts`). The web app's `/login` page is a dev-only sign-in
that stores the seeded AppUser id in a cookie for this purpose — it never gates authorization by
itself, the API re-checks role/ownership on every request.

To exercise the `/internal/*` routes (what the Lambda scaffolds in `apps/lambdas` call), set the
same `INTERNAL_API_KEY` value in both `apps/api/.env` and `apps/lambdas/.env`, then send it as the
`X-Internal-Api-Key` header — see `apps/lambdas/README.md`.

## Testing

```bash
npm run test --workspace apps/api
```

Covers: exhaustive legal/illegal transition checks for both the invoice and onboarding state
machines; idempotency + decrement/restore correctness for the ledger and credit-limit engines
(the two places a bug costs real money); the credit-limit funding gate (blocked, never partial,
at both underwrite-approve and fund); and the fee calculator (tier selection by gallons, fee %
applied to dollar volume, minimum-fee floor, advance/reserve split).

## Build phases

1. **Phase 1 (done)** — core schema, Cognito auth wiring (dev bypass until Phase 4), three
   skeleton portals, invoice upload → extraction stub → broker review → MC approval →
   underwriting → funding → payment reconciliation → settlement happy path.
2. **Phase 2 (done)** — Machinery Company credit limit now blocks funding outright (checked at
   underwriting-approve and again at fund, with a clear "which limit, by how much" error);
   admin-editable fee tier table + non-persisting calculator preview; monthly fee accrual across
   period boundaries (a multi-month invoice accrues again each month it stays outstanding) rolling
   up into per-Broker fee invoices; dispute/resolve flow; reserve-hold place/release with reason
   codes (blocks settlement while active); chargeback/repurchase (recourse to Broker, restores
   credit exposure immediately) and write-off.
3. **Phase 3 (done)** — email notifications (stub provider, `apps/api/src/notifications`) wired
   into key state changes (invoice funded/disputed/charged-back, underwriting reject/info-request,
   onboarding approved/rejected/suspended); a `/internal/*` API surface guarded by a shared secret
   for system-triggered actions (async extraction, fee runs, reserve-release checks, notification
   sending); four Lambda handler scaffolds in `apps/lambdas` that call those internal routes —
   structural only, not deployed; a richer admin dashboard (aging buckets for outstanding
   invoices, an open-disputes list, alongside the near/at-limit accounts list); and filters on the
   admin audit log viewer.
4. **Phase 4 (built, not applied)** — Terraform for all AWS infra: `network`, `database`
   (RDS-managed password, never in state), `cognito` (user pool + ADMIN/BROKER/MACHINERY_COMPANY
   groups), `s3` (invoice-docs, kyb-docs), `iam` (ECS roles, Lambda role, GitHub OIDC + two
   deploy roles — narrow app-deploy vs. broader terraform-apply), `ecs-service` (reusable Fargate
   + ALB, used for both `api` and `web`), `cloudfront` (path-based routing, `/api/*` to the API
   ALB), `lambda` + `eventbridge` (wires the Phase 3 scaffolds to real S3 event notifications and
   EventBridge schedules). Dockerfiles for both apps. GitHub Actions: CI, a read-only
   `terraform-plan` on every infra PR, a manual-only `terraform-apply`, and a `deploy` workflow
   that builds/pushes images, runs the DB migration as a one-off ECS task (never on container
   boot, to avoid a migration race across replicas), and updates both services plus the 4 Lambda
   functions' code. Single AWS account, dev/staging/prod separated by naming (three root modules
   calling one shared `modules/app` wrapper) rather than `terraform workspace`.

   **Nothing has been deployed.** No AWS credentials or Terraform CLI were available in the
   environment this was built in, so none of it has been run — see `terraform/README.md` for the
   manual prerequisites (state backend bootstrap, domain + ACM certs, GitHub secrets) required
   before a real `terraform apply`, and treat that as a deliberate, reviewed action, not something
   to automate blindly.

Notification delivery is deliberately decoupled from writing the notification: domain services
call `NotificationsService.notify()`, which only persists a PENDING row. Actual sending happens in
`processPending()`, invoked today via `POST /internal/notifications/process-pending` and in Phase 4
by the `notification-sender` Lambda on a schedule — this mirrors the eventual EventBridge-driven
architecture instead of sending synchronously inline.

The reserve-release check never auto-settles — it only notifies Admin that invoices are ready.
Settlement moves money and stays a deliberate human action (see `InvoicesService.settle`).

## Known open items (flagged for sign-off, not yet finalized)

- Settlement waterfall order and late-fee terms are **not finalized** in the source MOU. Reserve
  release on settlement currently pays out the full reserve with no waterfall ordering applied —
  confirm the definitive order (fees, adjustments, chargebacks, offsets) before this ships.
- Monthly gallon/dollar volume for fee-tier lookup is implemented as: every invoice that was
  outstanding (approved-for-funding through settlement/chargeback/write-off) at any point during
  the period, including invoices carried over from an earlier month. Confirm this matches how
  Brokers actually report volume — in particular, whether non-factored fuel should also count
  toward the gallon tier even though it contributes no invoice dollar volume.
