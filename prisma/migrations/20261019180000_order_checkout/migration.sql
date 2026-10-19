-- Checkout: public access token + idempotency key on Order, and a sequence for
-- human-readable order numbers (B-10001, B-10002...).

-- AlterTable: add as nullable, backfill existing rows, then enforce NOT NULL.
ALTER TABLE "Order" ADD COLUMN "accessToken" TEXT;
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;

UPDATE "Order"
SET "accessToken" = md5(random()::text || clock_timestamp()::text || "id") || md5("id" || random()::text),
    "idempotencyKey" = 'legacy-' || "id";

ALTER TABLE "Order" ALTER COLUMN "accessToken" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "idempotencyKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_accessToken_key" ON "Order"("accessToken");
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- Order numbers come from this sequence (not modeled in schema.prisma).
CREATE SEQUENCE "order_number_seq" START WITH 10001 INCREMENT BY 1;
