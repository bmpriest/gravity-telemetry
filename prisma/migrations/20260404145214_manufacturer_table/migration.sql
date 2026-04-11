-- Convert the Manufacturer enum into a table so admins can add new
-- manufacturers from the UI.
--
-- Postgres implicitly creates a TYPE with the same name as every CREATE TABLE,
-- so we have to drop the old "Manufacturer" enum type BEFORE creating the new
-- "Manufacturer" table — otherwise the table-creation collides with the
-- existing enum type. To safely drop the enum we first stash each row's enum
-- value in a temporary text column, drop the enum-typed column + the enum
-- type, then create the table and backfill the FK by joining on that text.

-- 1. Stash the existing enum value as plain text on each Ship row.
ALTER TABLE "Ship" ADD COLUMN "_manufacturer_text" TEXT;
UPDATE "Ship" SET "_manufacturer_text" = "manufacturer"::text;

-- 2. Drop the enum column and the now-unreferenced enum type.
ALTER TABLE "Ship" DROP COLUMN "manufacturer";
DROP TYPE "Manufacturer";

-- 3. Create the Manufacturer table.
CREATE TABLE "Manufacturer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Manufacturer_name_key" ON "Manufacturer"("name");

-- 4. Seed the original 5 manufacturers using human-readable display names —
-- the same strings that data/ships.ts and the seed script already use.
INSERT INTO "Manufacturer" ("name") VALUES
  ('Jupiter Industry'),
  ('NOMA Shipping'),
  ('Antonios'),
  ('Dawn Accord'),
  ('Empty');

-- 5. Add the FK column nullable so the backfill UPDATEs can land.
ALTER TABLE "Ship" ADD COLUMN "manufacturerId" INTEGER;

-- 6. Map the stashed enum identifier (PascalCase, no spaces) to the new
-- Manufacturer.id row. The mapping is hand-coded because the enum identifiers
-- and the display names diverge.
UPDATE "Ship" SET "manufacturerId" = (SELECT "id" FROM "Manufacturer" WHERE "name" = 'Jupiter Industry') WHERE "_manufacturer_text" = 'JupiterIndustry';
UPDATE "Ship" SET "manufacturerId" = (SELECT "id" FROM "Manufacturer" WHERE "name" = 'NOMA Shipping')    WHERE "_manufacturer_text" = 'NomaShipping';
UPDATE "Ship" SET "manufacturerId" = (SELECT "id" FROM "Manufacturer" WHERE "name" = 'Antonios')         WHERE "_manufacturer_text" = 'Antonios';
UPDATE "Ship" SET "manufacturerId" = (SELECT "id" FROM "Manufacturer" WHERE "name" = 'Dawn Accord')      WHERE "_manufacturer_text" = 'DawnAccord';
UPDATE "Ship" SET "manufacturerId" = (SELECT "id" FROM "Manufacturer" WHERE "name" = 'Empty')            WHERE "_manufacturer_text" = 'Empty';

-- 7. Drop the temp column, mark NOT NULL, add the FK constraint.
ALTER TABLE "Ship" DROP COLUMN "_manufacturer_text";
ALTER TABLE "Ship" ALTER COLUMN "manufacturerId" SET NOT NULL;
ALTER TABLE "Ship" ADD CONSTRAINT "Ship_manufacturerId_fkey"
  FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
