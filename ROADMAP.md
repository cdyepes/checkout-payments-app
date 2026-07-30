# Roadmap — Iterations 2–7 (checkout business logic → deployment)

> **Superseded in part**: iterations 2–7 below shipped a **single-product-per-transaction**
> checkout, as scoped at the time. Iteration 9 (`feat/shopping-cart`) later replaced that with a
> multi-product cart — `Transaction.productId`/`quantity` became a `TransactionItem` line-items
> table, and the frontend gained a `/cart` overlay. This document is left as-is below as the
> historical record of what iterations 2–7 actually planned and shipped; see the git history and
> `README.md` for the current (post-cart) shape. **Iterations 8–10, added after post-deployment
> testing surfaced a correctness bug and a UX gap, are documented at the bottom of this file.**

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
`apps/api/prisma/seed.ts` is now idempotent (`prisma.product.upsert()` keyed on a `@unique`
`Product.name`), so the deploy pipeline can safely (re-)seed production on every run.

## Iteration 7 — Bonus polish

**Goal**: Sweep the bonus rubric lines that don't have a natural home in the feature iterations —
OWASP alignment pass (rate limiting on transaction creation, CSP/security headers audit via
[observatory.mozilla.org](https://observatory.mozilla.org/) as the brief references, dependency
audit), Postman collection export alongside the existing Swagger, README completion (data model
diagram, coverage numbers, deployed links, architecture write-up), and a manual cross-browser /
responsive check.

---

# Roadmap addendum — Iterations 8–10

Iterations 1–7 above shipped and deployed the full test-brief scope. Using the live, deployed app
surfaced three follow-ups: a real correctness bug in the transactional plumbing, the biggest
remaining UX gap (no cart — one product per checkout), and two smaller polish items. Same process
as before: one GitHub issue → one branch → one PR that closes it → stop for review.

| # | Iteration | Branch | Status | Delivers |
|---|---|---|---|---|
| 8 | UnitOfWork rollback fix | `feat/unit-of-work-rollback` | **Shipped** (PR #14) | `UnitOfWork.run` made `Result`-aware so a mid-pipeline domain `Err` actually rolls back the Prisma transaction, instead of silently committing a partial write |
| 9 | Multi-product shopping cart | `feat/shopping-cart` | **Shipped** (PR #16) | `TransactionItem` line-items table + migration/backfill, N-item checkout with fees charged once per cart, a `/cart` overlay, settlement-shortfall handling |
| 10 | Checkout polish | `feat/checkout-polish` | Ready to build | Per-brand card length validation, responsive breakpoints above 480px |

## Iteration 8 — UnitOfWork rollback fix (shipped)

**Bug found**: `PrismaUnitOfWork.run` returned `prisma.$transaction(cb)` where `cb` resolved to a
neverthrow `Result` — an `Err` is a *resolved value*, not a rejection, so Prisma committed the
transaction regardless of the pipeline's outcome. Missed during iteration 2's live verification
because both failure paths tested there (insufficient stock, product not found) short-circuit
*before* any write.

**Fix**: `UnitOfWork.run<T, E>(work: () => ResultAsync<T, E>): ResultAsync<T, E>` instead of a bare
`Promise<T>`. The Prisma adapter throws a private `Rollback` sentinel when `work` resolves to `Err`,
forcing `prisma.$transaction` to actually roll back, then unwraps the sentinel back into an `Err`
outside the transaction. Verified by reproducing the bug against real local Postgres first (an
orphaned transaction + customer row committed despite the `Err`), then confirming zero rows commit
with the fix in place.

## Iteration 9 — Multi-product shopping cart (shipped)

**Goal**: replace single-product checkout with a real cart — one transaction carries N line items,
the customer fills the card + delivery form once, and base + delivery fees are charged **once per
cart**, not once per product.

**Delivered**:
- New `TransactionItem` line-items table with a **snapshotted `unitPriceInCents`** so a later
  catalogue price change never rewrites a historical order. Drops `Transaction.productId`/`quantity`
  and `Delivery.assignedProductId`/`quantity`, which items supersede.
- A hand-edited migration (Prisma emits drops before creates, backwards for a backfill) that
  backfills existing transactions into line items from the *historical order total*, guarded by SQL
  assertions that abort the whole migration on any mismatch — verified against real local Postgres
  data before merge.
- `CreateCheckoutTransactionUseCase` batch-loads products and folds a per-line stock/existence
  check; duplicate or empty `items` are rejected in zod before reaching the use case.
- `ReconcileTransactionUseCase.settleApproved` decrements every line (sorted by `productId` to avoid
  deadlocking a concurrent settlement) and only marks the delivery `ASSIGNED` if every line
  succeeds. If one line is short at settlement, the transaction **stays `APPROVED`** (the card was
  already charged) with `failureReason` naming the product(s) — not rolled back, not reported as a
  payment failure that didn't happen.
- Frontend: a `cart` slice holding only `{productId, quantity}` (prices always come live from the
  product catalogue), a `/cart` overlay reusing the background-location + Modal/Backdrop pattern,
  `ProductCard`'s "Buy" → "Add to cart". Cart persists across a refresh and clears only on an
  `APPROVED` settlement, so a declined card leaves it intact to retry.
- `deploy.yml` reordered to migrate before deploying the new Cloud Run revision, since this schema
  change isn't compatible with the old code running against the new schema (or vice versa).

**Verified**: multi-item fee math against real Postgres, `400`s on empty/duplicate items, a `409`
naming the *correct* product on insufficient stock, zero rows committed on every rejected request,
and full browser walkthroughs against the real payment-provider sandbox of both an approved and a declined
multi-item purchase. Caught and fixed one real bug along the way (a direct `/cart` load never
fetched the product catalogue) and one more from post-merge device testing: the cart/checkout
overlay's backdrop wrapper had no explicit width, so `.panel`'s `width: 100%` had nothing definite
to resolve against and overflowed on narrow viewports, clipping content at both edges — fixed by
giving the wrapper a real `width: 100%` + `min-width: 0`.

## Iteration 10 — Checkout polish (ready to build)

**Goal**: two small, unrelated polish items noticed during manual testing of the deployed app.

1. **Per-brand card length** (`apps/web/src/lib/card.ts`). Today `formatCardNumber` caps at 19
   digits and `isValidCardNumber` accepts any Luhn-valid length 13–19, for every brand — so a
   16-digit Mastercard can still be typed out to 19 digits. Visa genuinely issues 13/16/19-digit
   cards, so a blanket cap would be wrong; the fix is per-brand length tables, checked against the
   brand `detectCardBrand` already returns from the number's prefix.
2. **Responsive pass**. `--max-content-width: 480px` on `.app-shell` caps every screen at mobile
   width regardless of viewport, and the product grid only ever reaches 2 columns. Add real
   breakpoints (480 → 768 → 1100px) so the grid goes 1→2→3 columns and the shell uses the extra
   space on tablet/desktop, and audit 320–414px for overflow/tap-target issues — the same class of
   bug iteration 9 already found and fixed once in the cart/checkout overlays.

**Verification**: Chrome DevTools/emulation at 320/375/414/768/1024/1280px, screenshotting the
product grid, cart panel, checkout form, summary, and status screens at each breakpoint.
