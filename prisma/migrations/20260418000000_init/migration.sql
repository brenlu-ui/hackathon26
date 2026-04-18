-- CreateEnum
CREATE TYPE "Appliance" AS ENUM (
  'washing_machine',
  'dishwasher',
  'shower',
  'toilet',
  'kitchen_faucet',
  'garden_hose'
);

-- CreateTable
CREATE TABLE "Household" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplianceDefault" (
  "id" TEXT NOT NULL,
  "appliance" "Appliance" NOT NULL,
  "litersPerUnit" DECIMAL(8,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplianceDefault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterLog" (
  "id" TEXT NOT NULL,
  "appliance" "Appliance" NOT NULL,
  "quantity" DECIMAL(8,2) NOT NULL,
  "litersPerUnit" DECIMAL(8,2) NOT NULL,
  "estimatedLiters" DECIMAL(10,2) NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WaterLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplianceDefault_appliance_key" ON "ApplianceDefault"("appliance");

-- CreateIndex
CREATE INDEX "WaterLog_occurredAt_idx" ON "WaterLog"("occurredAt");

-- CreateIndex
CREATE INDEX "WaterLog_appliance_idx" ON "WaterLog"("appliance");
