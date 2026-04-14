-- AlterTable
ALTER TABLE "SavedFleet" ADD COLUMN     "maxCommandPoints" INTEGER NOT NULL DEFAULT 400,
ADD COLUMN     "moduleConfig" TEXT;
