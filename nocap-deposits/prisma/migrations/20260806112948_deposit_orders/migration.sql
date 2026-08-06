-- CreateTable
CREATE TABLE "DepositOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "currency" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "depositAmount" REAL NOT NULL,
    "balanceAmount" REAL NOT NULL,
    "balanceDueAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'BALANCE_DUE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DepositOrder_orderId_key" ON "DepositOrder"("orderId");

-- CreateIndex
CREATE INDEX "DepositOrder_shop_status_idx" ON "DepositOrder"("shop", "status");
