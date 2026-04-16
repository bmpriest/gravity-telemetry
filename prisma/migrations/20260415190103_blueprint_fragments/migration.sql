-- AlterTable
ALTER TABLE "Ship" ADD COLUMN     "isFragmentUnlocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BlueprintFragment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "BlueprintFragment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipFragment" (
    "shipId" INTEGER NOT NULL,
    "fragmentId" INTEGER NOT NULL,
    "quantityRequired" INTEGER NOT NULL,

    CONSTRAINT "ShipFragment_pkey" PRIMARY KEY ("shipId","fragmentId")
);

-- CreateTable
CREATE TABLE "UserFragment" (
    "accountId" TEXT NOT NULL,
    "fragmentId" INTEGER NOT NULL,
    "quantityOwned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserFragment_pkey" PRIMARY KEY ("accountId","fragmentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintFragment_name_key" ON "BlueprintFragment"("name");

-- AddForeignKey
ALTER TABLE "ShipFragment" ADD CONSTRAINT "ShipFragment_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipFragment" ADD CONSTRAINT "ShipFragment_fragmentId_fkey" FOREIGN KEY ("fragmentId") REFERENCES "BlueprintFragment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFragment" ADD CONSTRAINT "UserFragment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BlueprintAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFragment" ADD CONSTRAINT "UserFragment_fragmentId_fkey" FOREIGN KEY ("fragmentId") REFERENCES "BlueprintFragment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
