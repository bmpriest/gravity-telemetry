-- AlterTable
ALTER TABLE "Ship" ADD COLUMN     "dualPurpose" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onlyCarriesDualPurpose" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Subsystem" ADD COLUMN     "onlyCarriesDualPurpose" BOOLEAN NOT NULL DEFAULT false;
