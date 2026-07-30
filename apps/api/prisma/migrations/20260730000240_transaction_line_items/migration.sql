-- ============================================================
-- 1. Create the line-item table (must exist before the backfill)
-- ============================================================
CREATE TABLE "transaction_items" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceInCents" INTEGER NOT NULL,
    "subtotalInCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "transaction_items_transactionId_productId_key"
    ON "transaction_items"("transactionId", "productId");

CREATE INDEX "transaction_items_productId_idx" ON "transaction_items"("productId");

ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transactionId_fkey"
    FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 2. Guard rails schema.prisma cannot express (Prisma 5 ignores CHECK
--    constraints entirely — they won't show as drift on future migrate dev
--    runs, but they also won't appear in schema.prisma, so this comment is
--    the only documentation they get).
-- ============================================================
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_quantity_positive"
    CHECK ("quantity" > 0);

ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_amounts_nonnegative"
    CHECK ("unitPriceInCents" >= 0 AND "subtotalInCents" >= 0);

-- ============================================================
-- 3. Backfill one line item per existing transaction.
--    unitPriceInCents is reconstructed from the historical order total
--    (productAmountInCents / quantity), NOT from products.priceInCents —
--    the current catalogue price may already have drifted, and copying it
--    would rewrite history, which is the exact thing this column prevents.
--    `id` has no DB default: Prisma's uuid() is generated client-side, so
--    the migration must supply one itself.
-- ============================================================
INSERT INTO "transaction_items" (
    "id", "transactionId", "productId", "quantity",
    "unitPriceInCents", "subtotalInCents", "createdAt"
)
SELECT
    gen_random_uuid(),
    t."id",
    t."productId",
    t."quantity",
    t."productAmountInCents" / t."quantity",
    t."productAmountInCents",
    t."createdAt"
FROM "transactions" t;

-- ============================================================
-- 4. Prove the backfill is complete and value-preserving BEFORE dropping
--    the source columns. Prisma runs this file in one transaction, so any
--    RAISE EXCEPTION here rolls the entire migration back.
-- ============================================================
DO $$
DECLARE
    tx_count   BIGINT;
    item_count BIGINT;
    bad_totals BIGINT;
BEGIN
    SELECT count(*) INTO tx_count   FROM "transactions";
    SELECT count(*) INTO item_count FROM "transaction_items";

    IF tx_count <> item_count THEN
        RAISE EXCEPTION 'backfill mismatch: % transactions produced % line items', tx_count, item_count;
    END IF;

    SELECT count(*) INTO bad_totals
    FROM "transactions" t
    WHERE t."productAmountInCents" <> (
        SELECT COALESCE(sum(i."subtotalInCents"), 0)
        FROM "transaction_items" i
        WHERE i."transactionId" = t."id"
    );

    IF bad_totals > 0 THEN
        RAISE EXCEPTION 'sum(subtotalInCents) <> productAmountInCents on % transaction(s)', bad_totals;
    END IF;
END $$;

-- ============================================================
-- 5. Deliveries: prove both columns are redundant, then drop them.
--    No backfill is needed — their information content is fully recoverable
--    from transaction_items via deliveries."transactionId":
--      assignedProductId -> the item rows' productId
--      quantity          -> the item rows' quantity
--    The ASSIGNED/PENDING/DELIVERED fact itself lives in deliveries.status,
--    which is untouched, so nothing about fulfilment state is lost.
-- ============================================================
DO $$
DECLARE unrecoverable BIGINT;
BEGIN
    SELECT count(*) INTO unrecoverable
    FROM "deliveries" d
    WHERE d."assignedProductId" IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM "transaction_items" i
          WHERE i."transactionId" = d."transactionId"
            AND i."productId"     = d."assignedProductId"
      );

    IF unrecoverable > 0 THEN
        RAISE EXCEPTION 'deliveries.assignedProductId not recoverable from transaction_items for % row(s)', unrecoverable;
    END IF;
END $$;

ALTER TABLE "deliveries" DROP COLUMN "assignedProductId",
                         DROP COLUMN "quantity";

-- ============================================================
-- 6. Finally, drop the single-product columns from transactions
-- ============================================================
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_productId_fkey";

ALTER TABLE "transactions" DROP COLUMN "productId",
                           DROP COLUMN "quantity";
