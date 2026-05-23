-- AlterTable: add fields to RepairOrder that were added to the schema
-- after the initial migration but never migrated
ALTER TABLE "RepairOrder"
ADD COLUMN "isTrapped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "trappedCount" INTEGER,
ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "startedAt" TIMESTAMP(3);

-- AlterTable: add startedAt to MaintenancePlan (also missing from migrations)
ALTER TABLE "MaintenancePlan"
ADD COLUMN "startedAt" TIMESTAMP(3);
