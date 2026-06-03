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
    "orderingPolicy" TEXT DEFAULT 'Deposits cover material costs and are final. PayID details provided after ordering.',
    "depositPercentage" INTEGER NOT NULL DEFAULT 30
);
INSERT INTO "new_Config" ("adminCode", "cookDay", "finalDepositDate", "id", "orderingPolicy", "payIdInfo", "termsOfService") SELECT "adminCode", "cookDay", "finalDepositDate", "id", "orderingPolicy", "payIdInfo", "termsOfService" FROM "Config";
DROP TABLE "Config";
ALTER TABLE "new_Config" RENAME TO "Config";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
