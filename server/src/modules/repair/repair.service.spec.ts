import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RepairService } from './repair.service';
import { PrismaService } from '../../common/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { WorkflowService } from '../workflow/workflow.service';
import { RepairStatus } from '@prisma/client';

describe('RepairService', () => {
  let service: RepairService;
  let prisma: any;

  const mockPrisma = {
    repairOrder: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    repairPart: { createMany: jest.fn() },
    repairCost: { create: jest.fn(), findFirst: jest.fn() },
    repairMedia: { create: jest.fn(), findMany: jest.fn() },
    elevator: { findUnique: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(mockPrisma)),
  };

  const mockNotificationService = { createNotification: jest.fn() };
  const mockWorkflowService = { createWorkflow: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepairService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: WorkflowService, useValue: mockWorkflowService },
      ],
    }).compile();

    service = module.get<RepairService>(RepairService);
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Status machine
  // ---------------------------------------------------------------------------
  describe('updateStatus - state machine validation', () => {
    const baseRepair = {
      id: 'repair-1',
      orderNo: 'BX202605170001',
      reporterId: 'user-1',
      status: RepairStatus.PENDING_ACCEPT,
    };

    it('should allow valid transition PENDING_ACCEPT -> PENDING_REPAIR', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue(baseRepair);
      mockPrisma.repairOrder.update.mockResolvedValue({ ...baseRepair, status: RepairStatus.PENDING_REPAIR });

      const result = await service.updateStatus('repair-1', RepairStatus.PENDING_REPAIR);
      expect(result.status).toBe(RepairStatus.PENDING_REPAIR);
    });

    it('should reject invalid transition PENDING_ACCEPT -> APPROVED', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue(baseRepair);

      await expect(
        service.updateStatus('repair-1', RepairStatus.APPROVED),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid transition PENDING_ACCEPT -> CLOSED', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue(baseRepair);

      await expect(
        service.updateStatus('repair-1', RepairStatus.CLOSED),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid transition PENDING_REPAIR -> PENDING_SUPERVISOR', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        ...baseRepair,
        status: RepairStatus.PENDING_REPAIR,
      });
      mockPrisma.repairOrder.update.mockResolvedValue({
        ...baseRepair,
        status: RepairStatus.PENDING_SUPERVISOR,
      });

      const result = await service.updateStatus('repair-1', RepairStatus.PENDING_SUPERVISOR);
      expect(result.status).toBe(RepairStatus.PENDING_SUPERVISOR);
    });

    it('should allow valid chain PENDING_ACCEPT -> PENDING_REPAIR -> PENDING_SUPERVISOR -> PENDING_MANAGER -> APPROVED -> RESOLVED -> CLOSED', async () => {
      const statuses: { from: RepairStatus; to: RepairStatus }[] = [
        { from: RepairStatus.PENDING_ACCEPT, to: RepairStatus.PENDING_REPAIR },
        { from: RepairStatus.PENDING_REPAIR, to: RepairStatus.PENDING_SUPERVISOR },
        { from: RepairStatus.PENDING_SUPERVISOR, to: RepairStatus.PENDING_MANAGER },
        { from: RepairStatus.PENDING_MANAGER, to: RepairStatus.APPROVED },
        { from: RepairStatus.APPROVED, to: RepairStatus.RESOLVED },
        { from: RepairStatus.RESOLVED, to: RepairStatus.CLOSED },
      ];

      for (const { from, to } of statuses) {
        mockPrisma.repairOrder.findUnique.mockResolvedValue({ ...baseRepair, status: from });
        mockPrisma.repairOrder.update.mockResolvedValue({ ...baseRepair, status: to });
        const result = await service.updateStatus('repair-1', to);
        expect(result.status).toBe(to);
      }
    });

    it('should allow REJECT from PENDING_ACCEPT, PENDING_PARTS_VERIFY, PENDING_SUPERVISOR, PENDING_MANAGER', async () => {
      const rejectableStatuses = [
        RepairStatus.PENDING_ACCEPT,
        RepairStatus.PENDING_PARTS_VERIFY,
        RepairStatus.PENDING_SUPERVISOR,
        RepairStatus.PENDING_MANAGER,
      ];
      for (const from of rejectableStatuses) {
        mockPrisma.repairOrder.findUnique.mockResolvedValue({ ...baseRepair, status: from });
        mockPrisma.repairOrder.update.mockResolvedValue({ ...baseRepair, status: RepairStatus.REJECTED });
        await expect(
          service.updateStatus('repair-1', RepairStatus.REJECTED),
        ).resolves.toBeDefined();
      }
    });

    it('should throw NotFoundException when repair does not exist', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', RepairStatus.PENDING_REPAIR),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return same object when status is unchanged (no-op)', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue(baseRepair);

      const result = await service.updateStatus('repair-1', RepairStatus.PENDING_ACCEPT);
      expect(result).toEqual(baseRepair);
      expect(mockPrisma.repairOrder.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // addCost - existence check
  // ---------------------------------------------------------------------------
  describe('addCost', () => {
    it('should throw NotFoundException when repair does not exist', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.addCost('nonexistent', {
          costType: 'CONTRACT_IN',
          amount: 500,
          description: '维修费',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create cost when repair exists', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({ id: 'repair-1' });
      mockPrisma.repairCost.create.mockResolvedValue({
        id: 'cost-1',
        repairId: 'repair-1',
        costType: 'CONTRACT_IN',
        amount: 500,
      });

      const result = await service.addCost('repair-1', {
        costType: 'CONTRACT_IN',
        amount: 500,
        description: '维修费',
      });
      expect(result.id).toBe('cost-1');
    });
  });

  // ---------------------------------------------------------------------------
  // createRepair - workflow auto-creation
  // ---------------------------------------------------------------------------
  describe('createRepair', () => {
    const dto = {
      elevatorId: 'elevator-1',
      reporterId: 'user-1',
      stopType: '未停梯',
      urgency: 'NORMAL' as any,
      description: '测试故障',
    };

    it('should create workflow instance after repair creation', async () => {
      mockPrisma.repairOrder.create.mockResolvedValue({
        id: 'repair-1',
        orderNo: 'BX202605170001',
        elevator: { regCode: 'ELEV-001', maintainerId: null, customerServiceId: null },
        reporter: { id: 'user-1' },
      });
      mockWorkflowService.createWorkflow.mockResolvedValue({ id: 'wf-1' });

      await service.createRepair(dto);
      expect(mockWorkflowService.createWorkflow).toHaveBeenCalledWith('repair-1');
    });

    it('should not throw when workflow creation fails (graceful degradation)', async () => {
      mockPrisma.repairOrder.create.mockResolvedValue({
        id: 'repair-1',
        orderNo: 'BX202605170001',
        elevator: { regCode: 'ELEV-001', maintainerId: null, customerServiceId: null },
        reporter: { id: 'user-1' },
      });
      mockWorkflowService.createWorkflow.mockRejectedValue(new Error('DB error'));

      await expect(service.createRepair(dto)).resolves.toBeDefined();
    });
  });
});
