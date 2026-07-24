# Roadmap — Iterations 2–7 (checkout business logic → deployment)

## Context

Iteration 1 shipped the monorepo scaffold, hexagonal architecture template, and a fully working
products vertical slice (`github.com/cdyepes/checkout-payments-app`, CI green). No checkout business
logic exists yet — `customers`, `deliveries`, `transactions`, `payments` are still port-only stubs.

This plan breaks the remaining scope into 6 independently reviewable iterations, each shipped as
**one GitHub issue → one feature branch → one PR that closes it**, going backend-first, then
frontend, then deployment, then a bonus-points pass. This document is the full roadmap; **Iteration 2
is detailed enough to build immediately**, iterations 3–7 are scoped summaries to be fleshed out
(same lightweight process, no new planning session needed) as each one starts.

### Facts confirmed against the real payment provider (their public OpenAPI spec + docs)

These ground the `payments` adapter design in iteration 3, but matter now because they already
validate iteration 1's port shapes and the data model — no rework needed there.

- Card tokenization: `POST {api}/tokens/cards` (Bearer **public** key) — body `{number, cvc, exp_month, exp_year, card_holder}` → returns a token. Frontend-only call, never touches our backend.
- Terms acceptance: `GET {api}/merchants/{publicKey}` → `data.presigned_acceptance.acceptance_token` (short-lived JWT) + `permalink` (T&Cs URL to show the customer).
- Transaction creation: `POST {api}/transactions` (Bearer **private** key) — body `{acceptance_token, amount_in_cents, currency, customer_email, reference, signature, payment_method:{type:"CARD", token, installments}, redirect_url?, shipping_address?}`.
- **Integrity signature**: `signature = SHA256(reference + amount_in_cents + currency + integrity_secret)`, hex-encoded, fields concatenated in that exact order. Must be computed server-side (never expose the integrity secret to the browser).
- `reference` must be globally unique and is never reused once a transaction settles — we'll use the transaction's own UUID.
- Transaction status enum: `PENDING | APPROVED | DECLINED | ERROR | VOIDED` — **already exactly matches** our Prisma `TransactionStatus` enum and the `PaymentGateway` port from iteration 1.

### Decisions locked this session

| Area | Decision |
|---|---|
| Roadmap shape | 6 iterations, backend → frontend → deploy → polish (table below) |
| Stock policy | Validate `stock >= qty` at PENDING creation (reject upfront, no reservation); decrement only on APPROVED via a conditional `UPDATE ... WHERE stock >= qty` so it can never go negative. Known trade-off: a narrow race window remains on the last unit between two concurrent pending payments — acceptable for this scope, called out in the README. |
| Fees | Flat COP amounts: base fee 5,000 COP, delivery fee 8,000 COP, as named constants (`BASE_FEE_IN_CENTS = 500_000`, `DELIVERY_FEE_IN_CENTS = 800_000`, matching the existing `priceInCents = pesos × 100` convention from the seed data). |
| Screen architecture | Routed **background-location overlays**: keep `/checkout/details`, `/summary`, `/status`, but render them as Modal/Backdrop layered over the still-mounted `ProductPage` via React Router's background-location pattern — deep-linkable and refresh-resilient, and matches the brief's literal "Modal" / "backdrop component" wording. |
| Issue/PR granularity | One GitHub issue per iteration, one branch, one PR that closes it. |
| Process per iteration | `gh issue create` → `git checkout -b feat/<slug>` → build + test locally → push → `gh pr create` (closes the issue) → **stop and wait for review/merge** before starting the next iteration, same checkpoint pattern as iteration 1's repo-publish step. |
| Cadence | Start Iteration 2 immediately once this roadmap is approved — no separate go-ahead needed. |

## Roadmap

| # | Iteration | Branch | Delivers |
|---|---|---|---|
| 2 | Checkout submission backend | `feat/checkout-submission` | Customers/deliveries/transactions contexts filled in; one atomic use case creates a PENDING transaction with fee calc + stock validation |
| 3 | Payment gateway + reconcile | `feat/payment-gateway` | Real HTTP adapter to the provider's sandbox (signature, acceptance token, tokenized-card charge), idempotent reconcile-on-read |
| 4 | Card & delivery form (frontend) | `feat/card-delivery-form` | Modal step: card entry with Luhn + brand detection, delivery form, zod + react-hook-form validation |
| 5 | Summary & status screens (frontend) | `feat/summary-status-screens` | Backdrop summary with fee breakdown + pay button, status screen (polls, shows result, redirects with fresh stock) |
| 6 | Deployment | `feat/deployment` | CDK stacks (Lambda API, S3/CloudFront web), Neon Postgres, GitHub OIDC role, `deploy.yml`, live URLs |
| 7 | Bonus polish | `feat/bonus-polish` | OWASP/security-header pass, Postman collection, README data model + coverage + deployed links, cross-browser check |

---

## Iteration 2 — Checkout submission backend (ready to build)

**Goal**: `POST /api/transactions` takes `{productId, quantity, customer, delivery}`, validates
stock, computes fees, and atomically creates Customer (find-or-create by email) + Delivery +
Transaction (`PENDING`), returning a transaction id/reference the frontend will pay against in
iteration 3. This is the brief's step 5.1 ("create a transaction in PENDING... obtain a transaction
number").

### New shared building block: Unit of Work

The use case touches four repositories (Product read, Customer upsert, Transaction create, Delivery
create) that must commit atomically. Rather than leak Prisma into the application layer, add one
small port:

```ts
// shared/domain/unit-of-work.ts
export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');
export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
}
```

The Prisma adapter (`shared/infrastructure/prisma/prisma-unit-of-work.ts`) wraps `prisma.$transaction`.
Repositories keep their existing signatures — Prisma's `$transaction` callback already scopes all
queries made through the same client, so no repository method signatures need to change. Use case
unit tests fake `UnitOfWork.run` as `(work) => work()` and pass in-memory repository fakes, so no
real DB is touched.

### Files (following the `products` template from iteration 1)

- **`customers/`** — `infrastructure/persistence/{customer.mapper,prisma-customer.repository}.ts` implementing the existing `CustomerRepository` port (`findById`, `findOrCreateByEmail`); `infrastructure/http/customers.controller.ts` with `GET /customers/:id`; wire `customers.module.ts`.
- **`deliveries/`** — same pattern for `DeliveryRepository` (`findByTransactionId`, `create`, `assignProduct` — the last one stays unused until iteration 3's reconcile step); `GET /deliveries/:id`; wire `deliveries.module.ts`.
- **`transactions/`**
  - `domain/insufficient-stock.error.ts` — dedicated `DomainError` (409 Conflict semantics: the payload is valid, the state isn't) rather than overloading `ValidationFailedError`.
  - `application/create-checkout-transaction.use-case.ts` — the core orchestration: load Product → `product.hasStockFor(quantity)` (reuses the existing entity method) → find-or-create Customer → compute fees → create Transaction (`reference` = its own UUID) → create Delivery, all inside `UnitOfWork.run`.
  - `infrastructure/persistence/{transaction.mapper,prisma-transaction.repository}.ts` implementing the existing `TransactionRepository` port.
  - `infrastructure/http/transactions.controller.ts` — `POST /transactions`, `GET /transactions/:id` (read-only in this iteration; reconcile logic arrives in iteration 3).
  - Wire `transactions.module.ts`, register `UnitOfWork` provider in `AppModule`.
- **`packages/contracts`** — `CreateTransactionRequestSchema` (nested `customer`/`delivery` objects), `TransactionResponseSchema`, `CustomerResponseSchema`, `DeliveryResponseSchema`.

### Testing

Same pattern as the products slice: domain tests, mapper tests, repository tests against a mocked
`PrismaService`, controller tests, and — the important one — `CreateCheckoutTransactionUseCase`
tests covering: happy path, product not found, insufficient stock, zero/negative quantity, existing
vs. new customer. Coverage gate (80%, both apps) stays enforced by the existing CI workflow, no
changes needed there.

### Verification

```bash
npm run test:cov -w @checkout/api
npm run dev:api
curl -s -X POST localhost:3000/api/transactions -H 'content-type: application/json' -d '{...}' | jq
# expect: status "PENDING", correct fee breakdown, stock unchanged (not decremented yet)
curl -s localhost:3000/api/transactions/<id> | jq
```

---

## Iteration 3 — Payment gateway + reconcile

**Goal**: Real `HttpPaymentGateway` adapter implementing the existing `PaymentGateway` port against
the sandbox API (facts above): fetch acceptance token, compute the SHA256 signature server-side,
call `POST /transactions` with the frontend-obtained card token, store `providerTransactionId`.
Add an idempotent `ReconcileTransactionUseCase` invoked from `GET /transactions/:id` when status is
still `PENDING`: calls `getTransactionStatus`, and on a settled result applies the outcome exactly
once (transaction status update, `DeliveryRepository.assignProduct`, conditional stock decrement).
Sandbox keys go in `.env` (never committed); smoke-test against the real UAT sandbox during
development the same way iteration 1's API was verified live.

## Iteration 4 — Card & delivery form (frontend)

**Goal**: The Modal step (background-location overlay at `/checkout/details`) — card number/expiry/
CVC/holder fields with Luhn validation and Visa/Mastercard brand detection from the number prefix,
delivery address fields, all validated with `zod` + `react-hook-form` against schemas shared with
iteration 2's contracts where the shapes overlap. On submit, tokenizes the card directly with the
provider (public key, browser → provider, our API never sees a PAN) and stores only the resulting
token in local component state — never Redux, never localStorage.

## Iteration 5 — Summary & status screens (frontend)

**Goal**: Backdrop summary at `/checkout/summary` (product amount, base fee, delivery fee, total,
pay button) that on click calls iteration 2's `POST /transactions` then iteration 3's payment flow;
status screen at `/checkout/status` that polls `GET /transactions/:id` until settled, shows the
result, and redirects to the product page with stock refreshed from the API (not from stale Redux
state).

## Iteration 6 — Deployment

**Goal**: CDK stacks from the iteration-1 plan (Lambda + Function URL for the API via
serverless-express, S3 + CloudFront + OAC for the SPA with a security-headers response policy),
Neon Postgres for production, GitHub OIDC role (no long-lived AWS keys in secrets), `deploy.yml` on
merge to `main`. Ends with real public URLs for both README and the rubric's deployment block.

## Iteration 7 — Bonus polish

**Goal**: Sweep the bonus rubric lines that don't have a natural home in the feature iterations —
OWASP alignment pass (rate limiting on transaction creation, CSP/security headers audit via
[observatory.mozilla.org](https://observatory.mozilla.org/) as the brief references, dependency
audit), Postman collection export alongside the existing Swagger, README completion (data model
diagram, coverage numbers, deployed links, architecture write-up), and a manual cross-browser /
responsive check.
