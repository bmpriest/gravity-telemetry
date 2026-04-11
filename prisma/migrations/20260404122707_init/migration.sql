-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ShipType" AS ENUM ('Fighter', 'Corvette', 'Frigate', 'Destroyer', 'Cruiser', 'Battlecruiser', 'AuxiliaryShip', 'Carrier', 'Battleship');

-- CreateEnum
CREATE TYPE "Manufacturer" AS ENUM ('JupiterIndustry', 'NomaShipping', 'Antonios', 'DawnAccord', 'Empty');

-- CreateEnum
CREATE TYPE "ShipRow" AS ENUM ('Front', 'Middle', 'Back');

-- CreateEnum
CREATE TYPE "FighterSize" AS ENUM ('Small', 'Medium', 'Large');

-- CreateEnum
CREATE TYPE "ModuleKind" AS ENUM ('weapon', 'propulsion', 'armor', 'unknown');

-- CreateEnum
CREATE TYPE "SubsystemKind" AS ENUM ('weapon', 'hanger', 'misc');

-- CreateEnum
CREATE TYPE "DamageType" AS ENUM ('Projectile', 'Energy');

-- CreateEnum
CREATE TYPE "WeaponTarget" AS ENUM ('Building', 'Aircraft', 'SmallShip', 'LargeShip');

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
CREATE TABLE "Ship" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "img" TEXT NOT NULL,
    "type" "ShipType" NOT NULL,
    "variant" TEXT NOT NULL,
    "variantName" TEXT NOT NULL,
    "hasVariants" BOOLEAN NOT NULL,
    "manufacturer" "Manufacturer" NOT NULL,
    "row" "ShipRow" NOT NULL,
    "commandPoints" INTEGER NOT NULL,
    "serviceLimit" INTEGER NOT NULL,
    "fighterType" "FighterSize",
    "fightersPerSquadron" INTEGER,
    "smallFighterCapacity" INTEGER,
    "mediumFighterCapacity" INTEGER,
    "largeFighterCapacity" INTEGER,
    "corvetteCapacity" INTEGER,

    CONSTRAINT "Ship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipModule" (
    "id" SERIAL NOT NULL,
    "shipId" INTEGER NOT NULL,
    "kind" "ModuleKind" NOT NULL,
    "system" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isUnknown" BOOLEAN NOT NULL DEFAULT false,
    "img" TEXT,
    "name" TEXT,
    "hp" INTEGER,
    "antiship" INTEGER,
    "antiair" INTEGER,
    "siege" INTEGER,
    "cruise" INTEGER,
    "warp" INTEGER,
    "armor" INTEGER,
    "extraHp" INTEGER,
    "energyShield" INTEGER,
    "hpRecovery" INTEGER,
    "storage" INTEGER,

    CONSTRAINT "ShipModule_pkey" PRIMARY KEY ("id")
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
    "count" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "SubsystemKind" NOT NULL,
    "damageType" "DamageType",
    "target" "WeaponTarget",
    "lockonEfficiency" INTEGER,
    "alpha" INTEGER,
    "hanger" TEXT,
    "capacity" INTEGER,
    "repair" INTEGER,
    "cooldown" DOUBLE PRECISION,
    "lockOnTime" DOUBLE PRECISION,
    "duration" DOUBLE PRECISION,
    "damageFrequency" DOUBLE PRECISION,
    "attacksPerRoundA" INTEGER,
    "attacksPerRoundB" INTEGER,
    "operationCountA" INTEGER,
    "operationCountB" INTEGER,

    CONSTRAINT "Subsystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubsystemAttribute" (
    "id" SERIAL NOT NULL,
    "subsystemId" INTEGER NOT NULL,
    "attribute" TEXT NOT NULL,

    CONSTRAINT "SubsystemAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubsystemTargetCategory" (
    "id" SERIAL NOT NULL,
    "subsystemId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "damage" INTEGER NOT NULL,

    CONSTRAINT "SubsystemTargetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubsystemTargetType" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "targetType" TEXT NOT NULL,

    CONSTRAINT "SubsystemTargetType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubsystemUavPriority" (
    "id" SERIAL NOT NULL,
    "subsystemId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "targetType" TEXT NOT NULL,

    CONSTRAINT "SubsystemUavPriority_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "ModuleBlueprint" (
    "id" SERIAL NOT NULL,
    "shipBlueprintId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ModuleBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedFleet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
CREATE INDEX "Ship_type_idx" ON "Ship"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Ship_name_variant_key" ON "Ship"("name", "variant");

-- CreateIndex
CREATE INDEX "ShipModule_shipId_idx" ON "ShipModule"("shipId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipModule_shipId_system_key" ON "ShipModule"("shipId", "system");

-- CreateIndex
CREATE INDEX "ModuleSource_moduleId_idx" ON "ModuleSource"("moduleId");

-- CreateIndex
CREATE INDEX "Subsystem_moduleId_idx" ON "Subsystem"("moduleId");

-- CreateIndex
CREATE INDEX "SubsystemAttribute_subsystemId_idx" ON "SubsystemAttribute"("subsystemId");

-- CreateIndex
CREATE UNIQUE INDEX "SubsystemTargetCategory_subsystemId_category_key" ON "SubsystemTargetCategory"("subsystemId", "category");

-- CreateIndex
CREATE INDEX "SubsystemTargetType_categoryId_idx" ON "SubsystemTargetType"("categoryId");

-- CreateIndex
CREATE INDEX "SubsystemUavPriority_subsystemId_idx" ON "SubsystemUavPriority"("subsystemId");

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintAccount_userId_accountIndex_key" ON "BlueprintAccount"("userId", "accountIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ShipBlueprint_accountId_shipId_key" ON "ShipBlueprint"("accountId", "shipId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleBlueprint_shipBlueprintId_moduleId_key" ON "ModuleBlueprint"("shipBlueprintId", "moduleId");

-- CreateIndex
CREATE INDEX "FleetShipInstance_fleetId_idx" ON "FleetShipInstance"("fleetId");

-- CreateIndex
CREATE INDEX "SavedMail_userId_idx" ON "SavedMail"("userId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipModule" ADD CONSTRAINT "ShipModule_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleSource" ADD CONSTRAINT "ModuleSource_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ShipModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subsystem" ADD CONSTRAINT "Subsystem_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ShipModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubsystemAttribute" ADD CONSTRAINT "SubsystemAttribute_subsystemId_fkey" FOREIGN KEY ("subsystemId") REFERENCES "Subsystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubsystemTargetCategory" ADD CONSTRAINT "SubsystemTargetCategory_subsystemId_fkey" FOREIGN KEY ("subsystemId") REFERENCES "Subsystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubsystemTargetType" ADD CONSTRAINT "SubsystemTargetType_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SubsystemTargetCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubsystemUavPriority" ADD CONSTRAINT "SubsystemUavPriority_subsystemId_fkey" FOREIGN KEY ("subsystemId") REFERENCES "Subsystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintAccount" ADD CONSTRAINT "BlueprintAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipBlueprint" ADD CONSTRAINT "ShipBlueprint_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BlueprintAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipBlueprint" ADD CONSTRAINT "ShipBlueprint_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleBlueprint" ADD CONSTRAINT "ModuleBlueprint_shipBlueprintId_fkey" FOREIGN KEY ("shipBlueprintId") REFERENCES "ShipBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleBlueprint" ADD CONSTRAINT "ModuleBlueprint_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ShipModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedFleet" ADD CONSTRAINT "SavedFleet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetShipInstance" ADD CONSTRAINT "FleetShipInstance_fleetId_fkey" FOREIGN KEY ("fleetId") REFERENCES "SavedFleet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetShipInstance" ADD CONSTRAINT "FleetShipInstance_carrierInstanceId_fkey" FOREIGN KEY ("carrierInstanceId") REFERENCES "FleetShipInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedMail" ADD CONSTRAINT "SavedMail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
