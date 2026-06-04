-- AlterTable: System.shipId becomes nullable so UAV-owned systems have no direct ship link
ALTER TABLE "System" ALTER COLUMN "shipId" DROP NOT NULL;

-- AlterTable: System gets carriedCraftId FK so UAV systems can be rooted at a CarriedCraft
ALTER TABLE "System" ADD COLUMN "carriedCraftId" INTEGER;

-- AlterTable: Weapon gets lockOnTimeSeconds (the game's lock_on_time_seconds field)
ALTER TABLE "Weapon" ADD COLUMN "lockOnTimeSeconds" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "System_carriedCraftId_idx" ON "System"("carriedCraftId");

-- AddForeignKey
ALTER TABLE "System" ADD CONSTRAINT "System_carriedCraftId_fkey"
  FOREIGN KEY ("carriedCraftId") REFERENCES "CarriedCraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
