import { Test, TestingModule } from '@nestjs/testing';
import { MonthlyFeeService } from './monthly-fee.service';
import { PrismaService } from '../../common/prisma.service';

describe('MonthlyFeeService', () => {
  let service: MonthlyFeeService;
  let prisma: any;

  const mockPrisma = {
    contract: { findMany: jest.fn() },
    monthlyFee: { upsert: jest.fn() },
    monthlyFeeItem: { deleteMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonthlyFeeService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MonthlyFeeService>(MonthlyFeeService);
    jest.clearAllMocks();
  });

  describe('generate - overlapping contracts', () => {
    it('should deduplicate elevators across overlapping contracts', async () => {
      // Two contracts from the same maintenance unit covering the same elevators
      mockPrisma.contract.findMany.mockResolvedValue([
        {
          id: 'contract-1',
          maintenanceUnitId: 'unit-1',
          monthlyPrice: 500,
          status: 'ACTIVE',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          elevators: [
            { elevatorId: 'elev-1', elevator: { id: 'elev-1', projectId: 'proj-1' } },
            { elevatorId: 'elev-2', elevator: { id: 'elev-2', projectId: 'proj-1' } },
            { elevatorId: 'elev-3', elevator: { id: 'elev-3', projectId: 'proj-1' } },
          ],
        },
        {
          id: 'contract-2',
          maintenanceUnitId: 'unit-1',
          monthlyPrice: 500,
          status: 'ACTIVE',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2027-05-31'),
          elevators: [
            { elevatorId: 'elev-1', elevator: { id: 'elev-1', projectId: 'proj-1' } },
            { elevatorId: 'elev-2', elevator: { id: 'elev-2', projectId: 'proj-1' } },
          ],
        },
      ]);

      mockPrisma.monthlyFee.upsert.mockResolvedValue({ id: 'fee-1' });

      const result = await service.generate({ year: 2026, month: 6 });

      // Should have 3 unique elevators (not 5 = 3+2)
      expect(result.generated).toBe(1);

      // Verify the upsert was called with correct deduplicated count
      const upsertCall = mockPrisma.monthlyFee.upsert.mock.calls[0][0];
      expect(upsertCall.create.elevatorCount).toBe(3); // not 5!
      expect(Number(upsertCall.create.totalAmount)).toBe(1500); // 3 * 500, not 5 * 1000

      // Verify items created are per unique elevator (3 items, not 5)
      expect(mockPrisma.monthlyFeeItem.deleteMany).toHaveBeenCalledWith({
        where: { monthlyFeeId: 'fee-1' },
      });
      expect(mockPrisma.monthlyFeeItem.create).toHaveBeenCalledTimes(3);
    });

    it('should handle single contract without dedup issues', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        {
          id: 'contract-1',
          maintenanceUnitId: 'unit-1',
          monthlyPrice: 600,
          status: 'ACTIVE',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          elevators: [
            { elevatorId: 'elev-1', elevator: { id: 'elev-1', projectId: 'proj-1' } },
            { elevatorId: 'elev-2', elevator: { id: 'elev-2', projectId: 'proj-1' } },
          ],
        },
      ]);

      mockPrisma.monthlyFee.upsert.mockResolvedValue({ id: 'fee-2' });

      const result = await service.generate({ year: 2026, month: 1 });

      expect(result.generated).toBe(1);

      const upsertCall = mockPrisma.monthlyFee.upsert.mock.calls[0][0];
      expect(upsertCall.create.elevatorCount).toBe(2);
      expect(Number(upsertCall.create.totalAmount)).toBe(1200); // 2 * 600
    });

    it('should return 0 generated when no active contracts found', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([]);

      const result = await service.generate({ year: 2026, month: 1 });

      expect(result.generated).toBe(0);
      expect(result.message).toContain('没有找到有效合同');
    });

    it('should use transaction to ensure fee + items atomicity', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        {
          id: 'contract-1',
          maintenanceUnitId: 'unit-1',
          monthlyPrice: 500,
          status: 'ACTIVE',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          elevators: [
            { elevatorId: 'elev-1', elevator: { id: 'elev-1', projectId: 'proj-1' } },
          ],
        },
      ]);

      mockPrisma.monthlyFee.upsert.mockResolvedValue({ id: 'fee-3' });

      await service.generate({ year: 2026, month: 1 });

      // $transaction must be called (not raw upsert then deleteMany)
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
