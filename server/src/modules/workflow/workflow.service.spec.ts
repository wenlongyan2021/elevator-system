import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { PrismaService } from '../../common/prisma.service';
import { NotificationService } from '../notification/notification.service';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let prisma: any;
  let notificationService: any;

  const mockPrisma = {
    repairOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    workflowInstance: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    workflowNode: {
      create: jest.fn(),
    },
    fundMaterial: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockNotificationService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    jest.clearAllMocks();
  });

  describe('approve', () => {
    it('should throw NotFoundException when repair order does not exist', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue(null);

      await expect(service.approve('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when no workflow instance', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 'repair-1',
        status: 'PENDING_ACCEPT',
        workflow: null,
      });

      await expect(service.approve('repair-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when workflow is not active', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 'repair-1',
        status: 'CLOSED',
        workflow: { id: 'wf-1', status: 'COMPLETED' },
      });

      await expect(service.approve('repair-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getMaterials', () => {
    it('should return empty array when no workflow instance', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 'repair-1',
        workflow: null,
      });

      const result = await service.getMaterials('repair-1');
      expect(result).toEqual([]);
    });
  });

  describe('generateFundMaterialDoc', () => {
    it('should throw NotFoundException when repair order not found', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.generateFundMaterialDoc('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return a Buffer containing DOCX data', async () => {
      const mockRepair = {
        id: 'repair-1',
        orderNo: 'RE20240001',
        urgency: 'EMERGENCY',
        stopType: 'STOPPED',
        description: '电梯运行异响，有卡顿现象',
        status: 'PENDING_MANAGER',
        createdAt: new Date('2024-06-01'),
        completedAt: null,
        parts: [
          {
            id: 'part-1',
            partName: '门锁触点',
            partModel: 'MLC-01',
            quantity: 2,
            price: 150.0,
            costType: 'PUBLIC_FUND',
          },
        ],
        elevator: {
          regCode: 'EL20240001',
          building: '3栋',
          project: { name: '阳光花园小区' },
          customerService: { name: '张三' },
          safetyOfficer: { name: '李四' },
        },
        reporter: { name: '王五' },
        assignee: { name: '赵六' },
        workflow: {
          materials: [
            {
              materialType: 'ANNOUNCEMENT',
              title: '维修资金使用公示',
              createdAt: new Date('2024-06-02'),
            },
          ],
        },
      };

      mockPrisma.repairOrder.findUnique.mockResolvedValue(mockRepair);

      const buffer = await service.generateFundMaterialDoc('repair-1');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(100);
      // DOCX files start with PK (ZIP header)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });
  });
});
