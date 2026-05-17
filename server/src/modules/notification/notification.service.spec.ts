import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../common/prisma.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: any;

  const mockPrisma = {
    notification: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  describe('markAsRead', () => {
    it('should throw NotFoundException when notification does not exist', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when userId does not match (ownership check)', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-2', // belongs to another user
      });

      await expect(service.markAsRead('notif-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should mark as read when userId matches', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        isRead: false,
      });
      mockPrisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        isRead: true,
      });

      const result = await service.markAsRead('notif-1', 'user-1');
      expect(result.isRead).toBe(true);
    });

    it('should work without userId (no ownership check for backward compat)', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-2',
        isRead: false,
      });
      mockPrisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        isRead: true,
      });

      const result = await service.markAsRead('notif-1');
      expect(result.isRead).toBe(true);
    });
  });
});
