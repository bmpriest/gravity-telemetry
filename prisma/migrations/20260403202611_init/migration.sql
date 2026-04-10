-- CreateEnum
CREATE TYPE "ShipType" AS ENUM ('Fighter', 'Corvette', 'Frigate', 'Destroyer', 'Cruiser', 'Battlecruiser', 'AuxiliaryShip', 'Carrier', 'Battleship');

-- CreateEnum
CREATE TYPE "Manufacturer" AS ENUM ('JupiterIndustry', 'NomaShipping', 'Antonios', 'DawnAccord', 'Empty');

-- CreateEnum
CREATE TYPE "Row" AS ENUM ('Front', 'Middle', 'Back');

-- CreateEnum
CREATE TYPE "Variant" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "FighterType" AS ENUM ('Small', 'Medium', 'Large');

-- CreateEnum
CREATE TYPE "CarrierSlot" AS ENUM ('SmallFighter', 'MediumFighter', 'LargeFighter', 'Corvette');

-- CreateEnum
CREATE TYPE "ModuleSystem" AS ENUM ('M1', 'M2', 'M3', 'A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3', 'E1', 'E2', 'F1', 'F2', 'G1', 'G2', 'H1', 'H2');

-- CreateEnum
CREATE TYPE "ModuleKind" AS ENUM ('unknown', 'weapon', 'propulsion', 'misc');

-- CreateEnum
CREATE TYPE "SubsystemKind" AS ENUM ('weapon', 'hangerAircraft', 'hangerAttackUav', 'hangerRepairUav', 'hangerMiscUav', 'misc');

-- CreateEnum
CREATE TYPE "DamageType" AS ENUM ('Projectile', 'Energy');

-- CreateEnum
CREATE TYPE "WeaponTarget" AS ENUM ('Building', 'Aircraft', 'SmallShip', 'LargeShip');

-- CreateEnum
CREATE TYPE "SubsystemStatsKind" AS ENUM ('none', 'projectile', 'energy', 'uav');

-- CreateEnum
CREATE TYPE "TargetScope" AS ENUM ('antiship', 'antiair', 'siege', 'uav');

-- CreateEnum
CREATE TYPE "FleetRow" AS ENUM ('front', 'middle', 'back', 'reinforcements', 'carried');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attribute" (
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Ship" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "img" TEXT NOT NULL,
    "type" "ShipType" NOT NULL,
    "variant" "Variant" NOT NULL,
    "variantName" TEXT NOT NULL,
    "hasVariants" BOOLEAN NOT NULL,
    "manufacturer" "Manufacturer" NOT NULL,
    "row" "Row" NOT NULL,
    "commandPoints" INTEGER NOT NULL,
    "serviceLimit" INTEGER NOT NULL,
    "fighterType" "FighterType",
    "fightersPerSquadron" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipHangerCapacity" (
    "id" SERIAL NOT NULL,
    "shipId" INTEGER NOT NULL,
    "slotType" "CarrierSlot" NOT NULL,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "ShipHangerCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" SERIAL NOT NULL,
    "shipId" INTEGER NOT NULL,
    "system" "ModuleSystem" NOT NULL,
    "kind" "ModuleKind" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "img" TEXT NOT NULL,
    "name" TEXT,
    "hp" INTEGER,
    "antishipDamage" INTEGER,
    "antiairDamage" INTEGER,
    "siegeDamage" INTEGER,
    "cruise" INTEGER,
    "warp" INTEGER,
    "armor" INTEGER,
    "extraHp" INTEGER,
    "energyShield" INTEGER,
    "hpRecovery" INTEGER,
    "storage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleSource" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ModuleSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subsystem" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "kind" "SubsystemKind" NOT NULL,
    "count" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "damageType" "DamageType",
    "weaponTarget" "WeaponTarget",
    "lockonEfficiency" INTEGER,
    "alpha" INTEGER,
    "hangerSlot" TEXT,
    "capacity" INTEGER,
    "repair" INTEGER,
    "statsKind" "SubsystemStatsKind" NOT NULL DEFAULT 'none',
    "attacksPerRoundA" INTEGER,
    "attacksPerRoundB" INTEGER,
    "duration" INTEGER,
    "damageFrequency" INTEGER,
    "cooldown" INTEGER,
    "lockOnTime" INTEGER,
    "operationCountA" INTEGER,
    "operationCountB" INTEGER,
    "antishipPosition" INTEGER,
    "antishipDamage" INTEGER,
    "antiairPosition" INTEGER,
    "antiairDamage" INTEGER,
    "siegePosition" INTEGER,
    "siegeDamage" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Subsystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubsystemAttribute" (
    "subsystemId" INTEGER NOT NULL,
    "attributeName" TEXT NOT NULL,

    CONSTRAINT "SubsystemAttribute_pkey" PRIMARY KEY ("subsystemId","attributeName")
);

-- CreateTable
CREATE TABLE "TargetPriorityShipType" (
    "id" SERIAL NOT NULL,
    "subsystemId" INTEGER NOT NULL,
    "scope" "TargetScope" NOT NULL,
    "order" INTEGER NOT NULL,
    "shipType" TEXT NOT NULL,

    CONSTRAINT "TargetPriorityShipType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountIndex" INTEGER NOT NULL,
    "accountName" TEXT NOT NULL,
    "bpLastSaved" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlueprintAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintShipUnlock" (
    "id" SERIAL NOT NULL,
    "accountId" TEXT NOT NULL,
    "shipId" INTEGER NOT NULL,
    "techPoints" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BlueprintShipUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintModuleUnlock" (
    "id" SERIAL NOT NULL,
    "shipUnlockId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,

    CONSTRAINT "BlueprintModuleUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintUnassignedTp" (
    "id" SERIAL NOT NULL,
    "accountId" TEXT NOT NULL,
    "shipType" "ShipType" NOT NULL,
    "techPoints" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BlueprintUnassignedTp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedMail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ops" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSaved" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedMail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fleet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxCommandPoints" INTEGER NOT NULL DEFAULT 400,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fleet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetShipInstance" (
    "id" TEXT NOT NULL,
    "fleetId" TEXT NOT NULL,
    "shipId" INTEGER NOT NULL,
    "fleetRow" "FleetRow" NOT NULL,
    "carrierInstanceId" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "FleetShipInstance_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Ship_type_idx" ON "Ship"("type");

-- CreateIndex
CREATE INDEX "Ship_manufacturer_idx" ON "Ship"("manufacturer");

-- CreateIndex
CREATE INDEX "Ship_name_idx" ON "Ship"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Ship_name_variant_key" ON "Ship"("name", "variant");

-- CreateIndex
CREATE INDEX "ShipHangerCapacity_shipId_idx" ON "ShipHangerCapacity"("shipId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipHangerCapacity_shipId_slotType_key" ON "ShipHangerCapacity"("shipId", "slotType");

-- CreateIndex
CREATE INDEX "Module_shipId_idx" ON "Module"("shipId");

-- CreateIndex
CREATE INDEX "Module_kind_idx" ON "Module"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Module_shipId_system_key" ON "Module"("shipId", "system");

-- CreateIndex
CREATE INDEX "ModuleSource_moduleId_idx" ON "ModuleSource"("moduleId");

-- CreateIndex
CREATE INDEX "ModuleSource_name_idx" ON "ModuleSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleSource_moduleId_name_key" ON "ModuleSource"("moduleId", "name");

-- CreateIndex
CREATE INDEX "Subsystem_moduleId_idx" ON "Subsystem"("moduleId");

-- CreateIndex
CREATE INDEX "Subsystem_kind_idx" ON "Subsystem"("kind");

-- CreateIndex
CREATE INDEX "SubsystemAttribute_attributeName_idx" ON "SubsystemAttribute"("attributeName");

-- CreateIndex
CREATE INDEX "TargetPriorityShipType_subsystemId_scope_idx" ON "TargetPriorityShipType"("subsystemId", "scope");

-- CreateIndex
CREATE INDEX "BlueprintAccount_userId_idx" ON "BlueprintAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintAccount_userId_accountIndex_key" ON "BlueprintAccount"("userId", "accountIndex");

-- CreateIndex
CREATE INDEX "BlueprintShipUnlock_accountId_idx" ON "BlueprintShipUnlock"("accountId");

-- CreateIndex
CREATE INDEX "BlueprintShipUnlock_shipId_idx" ON "BlueprintShipUnlock"("shipId");

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintShipUnlock_accountId_shipId_key" ON "BlueprintShipUnlock"("accountId", "shipId");

-- CreateIndex
CREATE INDEX "BlueprintModuleUnlock_shipUnlockId_idx" ON "BlueprintModuleUnlock"("shipUnlockId");

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintModuleUnlock_shipUnlockId_moduleId_key" ON "BlueprintModuleUnlock"("shipUnlockId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintUnassignedTp_accountId_shipType_key" ON "BlueprintUnassignedTp"("accountId", "shipType");

-- CreateIndex
CREATE INDEX "SavedMail_userId_idx" ON "SavedMail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedMail_userId_name_key" ON "SavedMail"("userId", "name");

-- CreateIndex
CREATE INDEX "Fleet_userId_idx" ON "Fleet"("userId");

-- CreateIndex
CREATE INDEX "FleetShipInstance_fleetId_idx" ON "FleetShipInstance"("fleetId");

-- CreateIndex
CREATE INDEX "FleetShipInstance_carrierInstanceId_idx" ON "FleetShipInstance"("carrierInstanceId");

-- CreateIndex
CREATE INDEX "Alert_date_idx" ON "Alert"("date");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipHangerCapacity" ADD CONSTRAINT "ShipHangerCapacity_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleSource" ADD CONSTRAINT "ModuleSource_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subsystem" ADD CONSTRAINT "Subsystem_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubsystemAttribute" ADD CONSTRAINT "SubsystemAttribute_subsystemId_fkey" FOREIGN KEY ("subsystemId") REFERENCES "Subsystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubsystemAttribute" ADD CONSTRAINT "SubsystemAttribute_attributeName_fkey" FOREIGN KEY ("attributeName") REFERENCES "Attribute"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetPriorityShipType" ADD CONSTRAINT "TargetPriorityShipType_subsystemId_fkey" FOREIGN KEY ("subsystemId") REFERENCES "Subsystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintAccount" ADD CONSTRAINT "BlueprintAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintShipUnlock" ADD CONSTRAINT "BlueprintShipUnlock_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BlueprintAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintShipUnlock" ADD CONSTRAINT "BlueprintShipUnlock_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintModuleUnlock" ADD CONSTRAINT "BlueprintModuleUnlock_shipUnlockId_fkey" FOREIGN KEY ("shipUnlockId") REFERENCES "BlueprintShipUnlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintModuleUnlock" ADD CONSTRAINT "BlueprintModuleUnlock_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintUnassignedTp" ADD CONSTRAINT "BlueprintUnassignedTp_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BlueprintAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedMail" ADD CONSTRAINT "SavedMail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fleet" ADD CONSTRAINT "Fleet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetShipInstance" ADD CONSTRAINT "FleetShipInstance_fleetId_fkey" FOREIGN KEY ("fleetId") REFERENCES "Fleet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetShipInstance" ADD CONSTRAINT "FleetShipInstance_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetShipInstance" ADD CONSTRAINT "FleetShipInstance_carrierInstanceId_fkey" FOREIGN KEY ("carrierInstanceId") REFERENCES "FleetShipInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
