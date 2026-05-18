-- Add score and scoreLevel columns to MaintenanceUnit
ALTER TABLE "MaintenanceUnit" ADD COLUMN IF NOT EXISTS "score" DOUBLE PRECISION;
ALTER TABLE "MaintenanceUnit" ADD COLUMN IF NOT EXISTS "scoreLevel" TEXT;
UPDATE "MaintenanceUnit" SET "score" = 0 WHERE "score" IS NULL;

-- Add missing columns
ALTER TABLE "ContractEvaluation" ADD COLUMN IF NOT EXISTS "remark" TEXT;
ALTER TABLE "ContractPart" ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS "Contract_maintenanceUnitId_idx" ON "Contract"("maintenanceUnitId");
CREATE INDEX IF NOT EXISTS "Contract_status_idx" ON "Contract"("status");
CREATE INDEX IF NOT EXISTS "Contract_startDate_endDate_idx" ON "Contract"("startDate", "endDate");
CREATE INDEX IF NOT EXISTS "FaultRecord_elevatorId_idx" ON "FaultRecord"("elevatorId");
CREATE INDEX IF NOT EXISTS "FaultRecord_faultType_idx" ON "FaultRecord"("faultType");
CREATE INDEX IF NOT EXISTS "FaultRecord_createdAt_idx" ON "FaultRecord"("createdAt");
CREATE INDEX IF NOT EXISTS "FundMaterial_instanceId_idx" ON "FundMaterial"("instanceId");
CREATE INDEX IF NOT EXISTS "InspectionPhoto_taskId_idx" ON "InspectionPhoto"("taskId");
CREATE INDEX IF NOT EXISTS "InspectionTask_elevatorId_idx" ON "InspectionTask"("elevatorId");
CREATE INDEX IF NOT EXISTS "InspectionTask_inspectorId_idx" ON "InspectionTask"("inspectorId");
CREATE INDEX IF NOT EXISTS "InspectionTask_createdAt_idx" ON "InspectionTask"("createdAt");
CREATE INDEX IF NOT EXISTS "MaintenancePlan_elevatorId_idx" ON "MaintenancePlan"("elevatorId");
CREATE INDEX IF NOT EXISTS "MaintenancePlan_maintainerId_idx" ON "MaintenancePlan"("maintainerId");
CREATE INDEX IF NOT EXISTS "MaintenancePlan_status_idx" ON "MaintenancePlan"("status");
CREATE INDEX IF NOT EXISTS "MaintenancePlan_planDate_idx" ON "MaintenancePlan"("planDate");
CREATE INDEX IF NOT EXISTS "MonthlyFee_status_idx" ON "MonthlyFee"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyFee_maintenanceUnitId_yearMonth_key" ON "MonthlyFee"("maintenanceUnitId", "yearMonth");
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_type_idx" ON "Notification"("type");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX IF NOT EXISTS "RepairCost_repairId_idx" ON "RepairCost"("repairId");
CREATE INDEX IF NOT EXISTS "RepairMedia_repairId_idx" ON "RepairMedia"("repairId");
CREATE INDEX IF NOT EXISTS "RepairOrder_elevatorId_idx" ON "RepairOrder"("elevatorId");
CREATE INDEX IF NOT EXISTS "RepairOrder_status_idx" ON "RepairOrder"("status");
CREATE INDEX IF NOT EXISTS "RepairOrder_createdAt_idx" ON "RepairOrder"("createdAt");
CREATE INDEX IF NOT EXISTS "RepairPart_repairId_idx" ON "RepairPart"("repairId");
CREATE INDEX IF NOT EXISTS "RepairPart_partName_partModel_idx" ON "RepairPart"("partName", "partModel");
CREATE INDEX IF NOT EXISTS "WorkflowNode_instanceId_idx" ON "WorkflowNode"("instanceId");
CREATE INDEX IF NOT EXISTS "WorkflowNode_approverId_idx" ON "WorkflowNode"("approverId");
