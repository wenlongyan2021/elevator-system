import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { InspectionType, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class InspectionService {
  private readonly logger = new Logger(InspectionService.name);

  constructor(private prisma: PrismaService) {}

  async createTask(data: {
    elevatorId: string;
    inspectorId: string;
    type: InspectionType;
    location?: string;
    latitude?: number;
    longitude?: number;
    note?: string;
  }) {
    const elevator = await this.prisma.elevator.findUnique({
      where: { id: data.elevatorId },
    });
    if (!elevator) {
      throw new NotFoundException('电梯不存在');
    }

    const inspector = await this.prisma.user.findUnique({
      where: { id: data.inspectorId },
    });
    if (!inspector) {
      throw new NotFoundException('巡检人员不存在');
    }

    return this.prisma.inspectionTask.create({
      data: {
        elevatorId: data.elevatorId,
        inspectorId: data.inspectorId,
        type: data.type,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        note: data.note,
      },
      include: {
        elevator: {
          select: {
            id: true,
            regCode: true,
            brand: true,
            locationDesc: true,
            project: { select: { id: true, name: true } },
          },
        },
        inspector: {
          select: { id: true, name: true, phone: true },
        },
      },
    });
  }

  async addPhoto(taskId: string, data: { filePath: string; watermarkPath?: string; fileSize?: number }) {
    const task = await this.prisma.inspectionTask.findUnique({
      where: { id: taskId },
    });
    if (!task) {
      throw new NotFoundException('巡检任务不存在');
    }

    return this.prisma.inspectionPhoto.create({
      data: {
        taskId,
        filePath: data.filePath,
        watermarkPath: data.watermarkPath,
        fileSize: data.fileSize,
      },
    });
  }

  async getTasks(params: {
    elevatorId?: string;
    inspectorId?: string;
    type?: InspectionType;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { elevatorId, inspectorId, type, startDate, endDate, page = 1, limit = 20 } = params;

    const where: Prisma.InspectionTaskWhereInput = {};

    if (elevatorId) {
      where.elevatorId = elevatorId;
    }
    if (inspectorId) {
      where.inspectorId = inspectorId;
    }
    if (type) {
      where.type = type;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.inspectionTask.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          elevator: {
            select: {
              id: true,
              regCode: true,
              brand: true,
              locationDesc: true,
              project: { select: { id: true, name: true } },
            },
          },
          inspector: {
            select: { id: true, name: true, phone: true },
          },
          photos: {
            take: 3,
            orderBy: { createdAt: 'asc' },
            select: { filePath: true },
          },
          _count: {
            select: { photos: true },
          },
        },
      }),
      this.prisma.inspectionTask.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTaskDetail(id: string) {
    const task = await this.prisma.inspectionTask.findUnique({
      where: { id },
      include: {
        elevator: {
          select: {
            id: true,
            regCode: true,
            brand: true,
            model: true,
            floorCount: true,
            capacity: true,
            locationDesc: true,
            status: true,
            project: { select: { id: true, name: true } },
          },
        },
        inspector: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
        photos: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('巡检任务不存在');
    }

    return task;
  }

  async exportToExcel(params: {
    elevatorId?: string; inspectorId?: string; type?: InspectionType;
    startDate?: string; endDate?: string;
    page?: number; limit?: number;
  }): Promise<Buffer> {
    const result = await this.getTasks({ ...params, page: 1, limit: 99999 });
    const items: any[] = (result as any).items || [];

    const inspectionTypeLabels: Record<string, string> = {
      PATROL: '巡查', MAINTAIN_BEFORE: '维保前', MAINTAIN_DURING: '维保中', MAINTAIN_AFTER: '维保后',
    };

    const rows = items.map((t: any) => ({
      '电梯编号': t.elevator?.regCode || t.elevatorRegCode || '',
      '巡查类型': inspectionTypeLabels[t.type] || t.type,
      '检查人': t.inspector?.name || t.inspectorName || '',
      '位置': t.location || '',
      '备注': t.note || '',
      '照片数': t._count?.photos ?? t.photoCount ?? 0,
      '巡查时间': t.createdAt ? new Date(t.createdAt).toLocaleString('zh-CN') : '',
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, '巡查记录');
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }
}
