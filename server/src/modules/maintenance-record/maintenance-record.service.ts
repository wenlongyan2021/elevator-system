import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateMaintenanceRecordDto } from './dto/maintenance-record.dto';

@Injectable()
export class MaintenanceRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMaintenanceRecordDto) {
    const plan = await this.prisma.maintenancePlan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException(`维保计划 ${dto.planId} 不存在`);

    const record = await this.prisma.maintenanceRecord.create({
      data: {
        planId: dto.planId,
        elevatorId: dto.elevatorId,
        planType: dto.planType,
        maintainerIds: dto.maintainerIds,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : plan.startedAt || new Date(),
        completedAt: new Date(),
        summary: dto.summary,
        abnormalSituations: dto.abnormalSituations,
        isPassed: true,
        operatorId: dto.operatorId || dto.maintainerIds?.[0] || '',
        items: {
          create: dto.items.map(item => ({
            itemId: item.itemId,
            checkResult: item.checkResult,
            remark: item.remark,
          })),
        },
      },
      include: { items: true, elevator: true },
    });

    // Mark any NG items as failed
    const ngItems = dto.items.filter(i => i.checkResult === 'NG');
    if (ngItems.length > 0) {
      await this.prisma.maintenanceRecord.update({
        where: { id: record.id },
        data: { isPassed: false },
      });
    }

    return record;
  }

  async findByPlanId(planId: string) {
    return this.prisma.maintenanceRecord.findMany({
      where: { planId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { item: true } },
        elevator: true,
      },
    });
  }

  async findByElevator(elevatorId: string) {
    return this.prisma.maintenanceRecord.findMany({
      where: { elevatorId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { item: true } },
      },
    });
  }
}