-- AlterTable
ALTER TABLE "StockItem" ADD COLUMN "maxStock" REAL;

-- CreateTable
CREATE TABLE "FAQ" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "adminCode" TEXT NOT NULL DEFAULT '1234',
    "finalDepositDate" TEXT,
    "cookDay" TEXT,
    "payIdInfo" TEXT DEFAULT 'Your PayID Here',
    "termsOfService" TEXT DEFAULT 'To secure your order, a 30% non-refundable deposit is required upfront before smoking begins. Payments can be made via PayID or Cash. The remaining balance is payable upon pickup.',
    "orderingPolicy" TEXT DEFAULT 'Deposits cover material costs and are final. PayID details provided after ordering.'
);
INSERT INTO "new_Config" ("adminCode", "id") SELECT "adminCode", "id" FROM "Config";
DROP TABLE "Config";
ALTER TABLE "new_Config" RENAME TO "Config";
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderNumber" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "totalWeight" REAL NOT NULL,
    "estimatedTotal" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Order" ("estimatedTotal", "id", "items", "name", "phone", "timestamp", "totalWeight") SELECT "estimatedTotal", "id", "items", "name", "phone", "timestamp", "totalWeight" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
