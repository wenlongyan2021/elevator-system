import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  async createNotification(data: {
    userId: string;
    title: string;
    content?: string;
    type?: string;
    refId?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        content: data.content,
        type: data.type ?? 'SYSTEM',
        refId: data.refId,
      },
    });
  }

  async getNotifications(params: {
    userId: string;
    isRead?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { userId, isRead, page = 1, limit = 20 } = params;

    const where: Prisma.NotificationWhereInput = { userId };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAsRead(id: string, userId?: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    // Ensure the notification belongs to the requesting user
    if (userId && notification.userId !== userId) {
      throw new NotFoundException('通知不存在');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { message: '全部已读' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { unreadCount: count };
  }
}
