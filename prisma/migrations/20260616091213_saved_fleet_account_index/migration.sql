-- AlterTable
ALTER TABLE "SavedFleet" ADD COLUMN     "accountIndex" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "SavedFleet_userId_accountIndex_idx" ON "SavedFleet"("userId", "accountIndex");
