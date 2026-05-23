SET search_path TO public;
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PROJECT_MANAGER', 'PROJECT_SUPERVISOR', 'CUSTOMER_SERVICE', 'ENGINEER', 'SECURITY', 'ELEVATOR_MAINTAINER', 'SAFETY_OFFICER', 'SAFETY_DIRECTOR', 'ADMIN');
-- CreateEnum
CREATE TYPE "ElevatorStatus" AS ENUM ('RUNNING', 'STOPPED', 'MAINTENANCE', 'FAULT');
-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');
-- CreateEnum
CREATE TYPE "PartType" AS ENUM ('CHARGE', 'FREE');
-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('EMERGENCY', 'NORMAL', 'LOW');
-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('PENDING_ACCEPT', 'PENDING_REPAIR', 'PENDING_PARTS_VERIFY', 'PENDING_SUPERVISOR', 'PENDING_MANAGER', 'PENDING_FUND_REVIEW', 'APPROVED', 'RESOLVED', 'CLOSED', 'REJECTED');
-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('FREE', 'CONTRACT_IN', 'CONTRACT_OUT', 'PUBLIC_FUND');
-- CreateEnum
CREATE TYPE "WorkflowType" AS ENUM ('REPAIR', 'FUND_REPAIR');
-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'REJECTED');
-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('PATROL', 'MAINTAIN_BEFORE', 'MAINTAIN_DURING', 'MAINTAIN_AFTER');
-- CreateEnum
CREATE TYPE "FaultType" AS ENUM ('DOOR_FAULT', 'TRACTION_FAULT', 'CONTROL_FAULT', 'SAFETY_FAULT', 'TRAPPED', 'OTHER');
-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar" TEXT,
    "wxOpenId" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "title" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "supervisorId" TEXT,
    "maintenanceUnitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "UserProject" (
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserProject_pkey" PRIMARY KEY ("userId","projectId")
);
-- CreateTable
CREATE TABLE "Elevator" (
    "id" TEXT NOT NULL,
    "regCode" TEXT NOT NULL,
    "assetNo" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "floorCount" INTEGER,
    "capacity" INTEGER,
    "speed" DOUBLE PRECISION,
    "installDate" TIMESTAMP(3),
    "lastInspectDate" TIMESTAMP(3),
    "nextInspectDate" TIMESTAMP(3),
    "manufactureNo" TEXT,
    "status" "ElevatorStatus" NOT NULL DEFAULT 'RUNNING',
    "locationDesc" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "projectId" TEXT NOT NULL,
    "building" TEXT,
    "customerServiceId" TEXT,
    "safetyOfficerId" TEXT,
    "safetyDirectorId" TEXT,
    "maintainerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Elevator_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "contractNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maintenanceUnitId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "monthlyPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paymentCycle" TEXT NOT NULL DEFAULT 'monthly',
    "evaluationStd" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ContractElevator" (
    "contractId" TEXT NOT NULL,
    "elevatorId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContractElevator_pkey" PRIMARY KEY ("contractId","elevatorId")
);
-- CreateTable
CREATE TABLE "ContractPart" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "PartType" NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "unit" TEXT NOT NULL,
    "price" DECIMAL(65,30),
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContractPart_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ContractEvaluation" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "content" TEXT,
    "evaluator" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContractEvaluation_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "MaintenanceUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "level" TEXT,
    "score" DOUBLE PRECISION,
    "scoreLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaintenanceUnit_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "RepairOrder" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "elevatorId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "status" "RepairStatus" NOT NULL DEFAULT 'PENDING_ACCEPT',
    "stopType" TEXT,
    "urgency" "Urgency" NOT NULL DEFAULT 'NORMAL',
    "description" TEXT NOT NULL,
    "isPartsNeeded" BOOLEAN,
    "resolveNote" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RepairOrder_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "RepairMedia" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "thumbnail" TEXT,
    "watermark" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepairMedia_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "RepairPart" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "partModel" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "costType" "CostType" NOT NULL DEFAULT 'CONTRACT_IN',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepairPart_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "RepairCost" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "costType" "CostType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepairCost_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "WorkflowInstance" (
    "id" TEXT NOT NULL,
    "workflowType" "WorkflowType" NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "currentStep" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "WorkflowNode" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "approverId" TEXT,
    "action" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowNode_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "FundMaterial" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "filePath" TEXT,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FundMaterial_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "QRCode" (
    "id" TEXT NOT NULL,
    "elevatorId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "qrImagePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QRCode_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "InspectionTask" (
    "id" TEXT NOT NULL,
    "elevatorId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "type" "InspectionType" NOT NULL DEFAULT 'PATROL',
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InspectionTask_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "InspectionPhoto" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "watermarkPath" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InspectionPhoto_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "FaultRecord" (
    "id" TEXT NOT NULL,
    "elevatorId" TEXT NOT NULL,
    "faultType" "FaultType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "isTrapped" BOOLEAN NOT NULL DEFAULT false,
    "trappedCount" INTEGER,
    "downtime" INTEGER,
    "repairOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FaultRecord_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "MonthlyFee" (
    "id" TEXT NOT NULL,
    "maintenanceUnitId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "yearMonth" TIMESTAMP(3) NOT NULL,
    "elevatorCount" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "repairCostTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonthlyFee_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "MonthlyFeeItem" (
    "id" TEXT NOT NULL,
    "monthlyFeeId" TEXT NOT NULL,
    "elevatorId" TEXT NOT NULL,
    "costType" "CostType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthlyFeeItem_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "MaintenancePlan" (
    "id" TEXT NOT NULL,
    "elevatorId" TEXT NOT NULL,
    "planDate" TIMESTAMP(3) NOT NULL,
    "planType" TEXT NOT NULL,
    "maintainerIds" TEXT[] NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "type" TEXT NOT NULL,
    "refId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
-- CreateIndex
CREATE UNIQUE INDEX "User_wxOpenId_key" ON "User"("wxOpenId");
-- CreateIndex
CREATE UNIQUE INDEX "Elevator_regCode_key" ON "Elevator"("regCode");
-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNo_key" ON "Contract"("contractNo");
-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceUnit_name_key" ON "MaintenanceUnit"("name");
-- CreateIndex
CREATE UNIQUE INDEX "RepairOrder_orderNo_key" ON "RepairOrder"("orderNo");
-- CreateIndex
CREATE UNIQUE INDEX "WorkflowInstance_repairOrderId_key" ON "WorkflowInstance"("repairOrderId");
-- CreateIndex
CREATE UNIQUE INDEX "QRCode_elevatorId_key" ON "QRCode"("elevatorId");
-- CreateIndex
CREATE UNIQUE INDEX "QRCode_code_key" ON "QRCode"("code");
-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");
-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "UserProject" ADD CONSTRAINT "UserProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "UserProject" ADD CONSTRAINT "UserProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Elevator" ADD CONSTRAINT "Elevator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Elevator" ADD CONSTRAINT "Elevator_customerServiceId_fkey" FOREIGN KEY ("customerServiceId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Elevator" ADD CONSTRAINT "Elevator_safetyOfficerId_fkey" FOREIGN KEY ("safetyOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Elevator" ADD CONSTRAINT "Elevator_safetyDirectorId_fkey" FOREIGN KEY ("safetyDirectorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Elevator" ADD CONSTRAINT "Elevator_maintainerId_fkey" FOREIGN KEY ("maintainerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_maintenanceUnitId_fkey" FOREIGN KEY ("maintenanceUnitId") REFERENCES "MaintenanceUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ContractElevator" ADD CONSTRAINT "ContractElevator_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ContractElevator" ADD CONSTRAINT "ContractElevator_elevatorId_fkey" FOREIGN KEY ("elevatorId") REFERENCES "Elevator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ContractPart" ADD CONSTRAINT "ContractPart_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ContractEvaluation" ADD CONSTRAINT "ContractEvaluation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_elevatorId_fkey" FOREIGN KEY ("elevatorId") REFERENCES "Elevator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "RepairMedia" ADD CONSTRAINT "RepairMedia_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "RepairPart" ADD CONSTRAINT "RepairPart_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "RepairCost" ADD CONSTRAINT "RepairCost_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "WorkflowNode" ADD CONSTRAINT "WorkflowNode_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WorkflowInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "WorkflowNode" ADD CONSTRAINT "WorkflowNode_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "FundMaterial" ADD CONSTRAINT "FundMaterial_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WorkflowInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_elevatorId_fkey" FOREIGN KEY ("elevatorId") REFERENCES "Elevator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "InspectionTask" ADD CONSTRAINT "InspectionTask_elevatorId_fkey" FOREIGN KEY ("elevatorId") REFERENCES "Elevator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "InspectionTask" ADD CONSTRAINT "InspectionTask_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "InspectionPhoto" ADD CONSTRAINT "InspectionPhoto_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "InspectionTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "FaultRecord" ADD CONSTRAINT "FaultRecord_elevatorId_fkey" FOREIGN KEY ("elevatorId") REFERENCES "Elevator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "MonthlyFeeItem" ADD CONSTRAINT "MonthlyFeeItem_monthlyFeeId_fkey" FOREIGN KEY ("monthlyFeeId") REFERENCES "MonthlyFee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "MonthlyFeeItem" ADD CONSTRAINT "MonthlyFeeItem_elevatorId_fkey" FOREIGN KEY ("elevatorId") REFERENCES "Elevator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_elevatorId_fkey" FOREIGN KEY ("elevatorId") REFERENCES "Elevator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
