-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ShipRow" AS ENUM ('Front', 'Middle', 'Back');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoggedIn" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manufacturer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "externalId" INTEGER,
    "logo" TEXT,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ship" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "img" TEXT NOT NULL DEFAULT '',
    "variant" TEXT NOT NULL DEFAULT 'A',
    "variantName" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "manufacturerId" INTEGER NOT NULL,
    "rowPosition" TEXT NOT NULL DEFAULT 'Front',
    "commandPoints" INTEGER NOT NULL DEFAULT 0,
    "serviceLimit" INTEGER NOT NULL DEFAULT 0,
    "hp" INTEGER NOT NULL DEFAULT 0,
    "armor" INTEGER NOT NULL DEFAULT 0,
    "energyShield" INTEGER NOT NULL DEFAULT 0,
    "armorRepairRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cruisingSpeed" INTEGER NOT NULL DEFAULT 0,
    "warpSpeed" INTEGER NOT NULL DEFAULT 0,
    "viewRadius" INTEGER NOT NULL DEFAULT 0,
    "storage" INTEGER NOT NULL DEFAULT 0,
    "aircraftType" TEXT,
    "aircraftDualPurpose" BOOLEAN NOT NULL DEFAULT false,
    "battleMoveTypeName" TEXT,
    "aircraftFormationSize" INTEGER,
    "prodMetal" INTEGER NOT NULL DEFAULT 0,
    "prodCrystal" INTEGER NOT NULL DEFAULT 0,
    "prodDeuterium" INTEGER NOT NULL DEFAULT 0,
    "buildTimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "dpmAntiShip" INTEGER NOT NULL DEFAULT 0,
    "dpmAntiAir" INTEGER NOT NULL DEFAULT 0,
    "dpmSiege" INTEGER NOT NULL DEFAULT 0,
    "dpmHpRecovery" INTEGER NOT NULL DEFAULT 0,
    "dpmOperationEfficiency" INTEGER NOT NULL DEFAULT 0,
    "ratingAntiShip" TEXT,
    "ratingAntiAir" TEXT,
    "ratingSiege" TEXT,
    "ratingSupport" TEXT,
    "ratingSurvivability" TEXT,
    "ratingStrategic" TEXT,
    "isSp" INTEGER NOT NULL DEFAULT 0,
    "bpType" INTEGER NOT NULL DEFAULT 0,
    "isRe" INTEGER NOT NULL DEFAULT 0,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Ship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipHangarStat" (
    "id" SERIAL NOT NULL,
    "shipId" INTEGER NOT NULL,
    "craftType" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "carriesDualPurpose" BOOLEAN NOT NULL DEFAULT false,
    "slotQuantity" INTEGER NOT NULL DEFAULT 0,
    "systemName" TEXT,
    "moduleName" TEXT,
    "moduleShortName" TEXT,

    CONSTRAINT "ShipHangarStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipAffix" (
    "id" SERIAL NOT NULL,
    "shipId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShipAffix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "System" (
    "id" SERIAL NOT NULL,
    "shipId" INTEGER NOT NULL,
    "index" INTEGER NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "iconKey" TEXT,
    "systemTypeName" TEXT NOT NULL,
    "hp" INTEGER NOT NULL DEFAULT 0,
    "armor" INTEGER NOT NULL DEFAULT 0,
    "energyShield" INTEGER NOT NULL DEFAULT 0,
    "slotCount" INTEGER NOT NULL DEFAULT 0,
    "mainSystem" BOOLEAN NOT NULL DEFAULT false,
    "attackable" BOOLEAN NOT NULL DEFAULT false,
    "group" INTEGER,
    "includedWithBlueprint" BOOLEAN,
    "pointRequiredForUnlockGroup" INTEGER,
    "unlockRequired" BOOLEAN,
    "dpmAntiShip" INTEGER NOT NULL DEFAULT 0,
    "dpmAntiAir" INTEGER NOT NULL DEFAULT 0,
    "dpmSiege" INTEGER NOT NULL DEFAULT 0,
    "dpmHpRecovery" INTEGER NOT NULL DEFAULT 0,
    "dpmOperationEfficiency" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "System_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slot" (
    "id" SERIAL NOT NULL,
    "systemId" INTEGER NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "antiAircraftCooperativeEfficiency" INTEGER,
    "dpmAntiShip" INTEGER NOT NULL DEFAULT 0,
    "dpmAntiAir" INTEGER NOT NULL DEFAULT 0,
    "dpmSiege" INTEGER NOT NULL DEFAULT 0,
    "dpmHpRecovery" INTEGER NOT NULL DEFAULT 0,
    "dpmOperationEfficiency" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" SERIAL NOT NULL,
    "slotId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL DEFAULT '',
    "typeName" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "prioritizedTargetLabel" TEXT,
    "trajectory" TEXT,
    "hangarCapacity" INTEGER,
    "hangarCraftType" TEXT,
    "ccDpmAntiShip" INTEGER NOT NULL DEFAULT 0,
    "ccDpmAntiAir" INTEGER NOT NULL DEFAULT 0,
    "ccDpmSiege" INTEGER NOT NULL DEFAULT 0,
    "ccDpmHpRecovery" INTEGER NOT NULL DEFAULT 0,
    "ccDpmOperationEfficiency" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleEffect" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "value" INTEGER,
    "attrName" TEXT,
    "attrDesc" TEXT,
    "desc" TEXT,
    "descSimp" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ModuleEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarriedCraft" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "dpmAntiShip" INTEGER NOT NULL DEFAULT 0,
    "dpmAntiAir" INTEGER NOT NULL DEFAULT 0,
    "dpmSiege" INTEGER NOT NULL DEFAULT 0,
    "dpmHpRecovery" INTEGER NOT NULL DEFAULT 0,
    "dpmOperationEfficiency" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CarriedCraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Weapon" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "intervalSeconds" DOUBLE PRECISION,
    "cdTimeSeconds" DOUBLE PRECISION,
    "roundsPerCycle" INTEGER,
    "ammoCount" INTEGER,
    "operationCount" INTEGER,
    "operationValue" INTEGER,
    "operationStrength" INTEGER,
    "weaponLevel" INTEGER,
    "weaponTypeName" TEXT,
    "damageTypeName" TEXT,
    "damagePerHit" INTEGER,
    "healingValue" INTEGER,
    "durationSeconds" DOUBLE PRECISION,
    "aircraftRangeName" TEXT,
    "attackRangeName" TEXT,
    "specialTargetLogicName" TEXT,
    "dpmAntiShip" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dpmAntiAir" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dpmSiege" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dpmHpRecovery" INTEGER NOT NULL DEFAULT 0,
    "dpmOperationEfficiency" INTEGER NOT NULL DEFAULT 0,
    "aaCooldownReductionPercent" INTEGER,
    "aaDamagePerHitDelta" INTEGER,
    "aaDurationReductionPercent" INTEGER,
    "buffEffectId" INTEGER,
    "buffDesc" TEXT,
    "buffAttrName" TEXT,
    "buffAttrDescTemplate" TEXT,
    "buffAttrDesc" TEXT,

    CONSTRAINT "Weapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetPriority" (
    "id" SERIAL NOT NULL,
    "weaponId" INTEGER NOT NULL,
    "priorityRank" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TargetPriority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetType" (
    "id" SERIAL NOT NULL,
    "targetPriorityId" INTEGER NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetHitRate" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TargetType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintFragment" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imagePath" TEXT,
    "common" BOOLEAN NOT NULL DEFAULT false,
    "exchangeCost" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BlueprintFragment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipFragment" (
    "id" SERIAL NOT NULL,
    "shipId" INTEGER NOT NULL,
    "fragmentId" INTEGER NOT NULL,
    "quantityRequired" INTEGER NOT NULL DEFAULT 0,
    "group" INTEGER,
    "index" INTEGER,

    CONSTRAINT "ShipFragment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountIndex" INTEGER NOT NULL,
    "accountName" TEXT NOT NULL,
    "lastSaved" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedTp0" INTEGER NOT NULL DEFAULT 0,
    "unassignedTp1" INTEGER NOT NULL DEFAULT 0,
    "unassignedTp2" INTEGER NOT NULL DEFAULT 0,
    "unassignedTp3" INTEGER NOT NULL DEFAULT 0,
    "unassignedTp4" INTEGER NOT NULL DEFAULT 0,
    "unassignedTp5" INTEGER NOT NULL DEFAULT 0,
    "unassignedTp6" INTEGER NOT NULL DEFAULT 0,
    "unassignedTp7" INTEGER NOT NULL DEFAULT 0,
    "unassignedTp8" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BlueprintAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipBlueprint" (
    "id" SERIAL NOT NULL,
    "accountId" TEXT NOT NULL,
    "shipId" INTEGER NOT NULL,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "techPoints" INTEGER NOT NULL DEFAULT 0,
    "mirrorTechPoints" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ShipBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemBlueprint" (
    "id" SERIAL NOT NULL,
    "shipBlueprintId" INTEGER NOT NULL,
    "systemId" INTEGER NOT NULL,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SystemBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFragment" (
    "accountId" TEXT NOT NULL,
    "fragmentId" INTEGER NOT NULL,
    "quantityOwned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserFragment_pkey" PRIMARY KEY ("accountId","fragmentId")
);

-- CreateTable
CREATE TABLE "SavedFleet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxCommandPoints" INTEGER NOT NULL DEFAULT 400,
    "moduleConfig" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isAngulum" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SavedFleet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetShipInstance" (
    "id" TEXT NOT NULL,
    "fleetId" TEXT NOT NULL,
    "shipId" INTEGER NOT NULL,
    "variant" TEXT NOT NULL,
    "row" "ShipRow" NOT NULL,
    "isReinforcement" BOOLEAN NOT NULL DEFAULT false,
    "carrierInstanceId" TEXT,

    CONSTRAINT "FleetShipInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedMail" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ops" TEXT NOT NULL,
    "lastSaved" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SavedMail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "show" BOOLEAN NOT NULL DEFAULT true,
    "tag" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer_name_key" ON "Manufacturer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer_externalId_key" ON "Manufacturer"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Ship_gameId_key" ON "Ship"("gameId");

-- CreateIndex
CREATE INDEX "Ship_type_idx" ON "Ship"("type");

-- CreateIndex
CREATE INDEX "Ship_shortName_idx" ON "Ship"("shortName");

-- CreateIndex
CREATE INDEX "Ship_visible_idx" ON "Ship"("visible");

-- CreateIndex
CREATE INDEX "ShipHangarStat_shipId_idx" ON "ShipHangarStat"("shipId");

-- CreateIndex
CREATE INDEX "ShipAffix_shipId_idx" ON "ShipAffix"("shipId");

-- CreateIndex
CREATE INDEX "System_shipId_idx" ON "System"("shipId");

-- CreateIndex
CREATE INDEX "System_code_idx" ON "System"("code");

-- CreateIndex
CREATE INDEX "Slot_systemId_idx" ON "Slot"("systemId");

-- CreateIndex
CREATE INDEX "Module_slotId_idx" ON "Module"("slotId");

-- CreateIndex
CREATE INDEX "ModuleEffect_moduleId_idx" ON "ModuleEffect"("moduleId");

-- CreateIndex
CREATE INDEX "CarriedCraft_moduleId_idx" ON "CarriedCraft"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Weapon_moduleId_key" ON "Weapon"("moduleId");

-- CreateIndex
CREATE INDEX "Weapon_moduleId_idx" ON "Weapon"("moduleId");

-- CreateIndex
CREATE INDEX "TargetPriority_weaponId_idx" ON "TargetPriority"("weaponId");

-- CreateIndex
CREATE INDEX "TargetType_targetPriorityId_idx" ON "TargetType"("targetPriorityId");

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintFragment_gameId_key" ON "BlueprintFragment"("gameId");

-- CreateIndex
CREATE INDEX "ShipFragment_shipId_idx" ON "ShipFragment"("shipId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipFragment_shipId_fragmentId_key" ON "ShipFragment"("shipId", "fragmentId");

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintAccount_userId_accountIndex_key" ON "BlueprintAccount"("userId", "accountIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ShipBlueprint_accountId_shipId_key" ON "ShipBlueprint"("accountId", "shipId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemBlueprint_shipBlueprintId_systemId_key" ON "SystemBlueprint"("shipBlueprintId", "systemId");

-- CreateIndex
CREATE INDEX "FleetShipInstance_fleetId_idx" ON "FleetShipInstance"("fleetId");

-- CreateIndex
CREATE INDEX "SavedMail_userId_idx" ON "SavedMail"("userId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ship" ADD CONSTRAINT "Ship_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipHangarStat" ADD CONSTRAINT "ShipHangarStat_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipAffix" ADD CONSTRAINT "ShipAffix_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "System" ADD CONSTRAINT "System_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleEffect" ADD CONSTRAINT "ModuleEffect_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarriedCraft" ADD CONSTRAINT "CarriedCraft_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Weapon" ADD CONSTRAINT "Weapon_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetPriority" ADD CONSTRAINT "TargetPriority_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "Weapon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetType" ADD CONSTRAINT "TargetType_targetPriorityId_fkey" FOREIGN KEY ("targetPriorityId") REFERENCES "TargetPriority"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipFragment" ADD CONSTRAINT "ShipFragment_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipFragment" ADD CONSTRAINT "ShipFragment_fragmentId_fkey" FOREIGN KEY ("fragmentId") REFERENCES "BlueprintFragment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintAccount" ADD CONSTRAINT "BlueprintAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipBlueprint" ADD CONSTRAINT "ShipBlueprint_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BlueprintAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipBlueprint" ADD CONSTRAINT "ShipBlueprint_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemBlueprint" ADD CONSTRAINT "SystemBlueprint_shipBlueprintId_fkey" FOREIGN KEY ("shipBlueprintId") REFERENCES "ShipBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemBlueprint" ADD CONSTRAINT "SystemBlueprint_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFragment" ADD CONSTRAINT "UserFragment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BlueprintAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFragment" ADD CONSTRAINT "UserFragment_fragmentId_fkey" FOREIGN KEY ("fragmentId") REFERENCES "BlueprintFragment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedFleet" ADD CONSTRAINT "SavedFleet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetShipInstance" ADD CONSTRAINT "FleetShipInstance_fleetId_fkey" FOREIGN KEY ("fleetId") REFERENCES "SavedFleet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetShipInstance" ADD CONSTRAINT "FleetShipInstance_carrierInstanceId_fkey" FOREIGN KEY ("carrierInstanceId") REFERENCES "FleetShipInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedMail" ADD CONSTRAINT "SavedMail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
