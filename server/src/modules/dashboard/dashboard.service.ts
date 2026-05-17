import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async getOverview() {
    const cacheKey = CacheService.key('dashboard', 'overview');
    const cached = await this.cache.get<ReturnType<typeof this.getOverview>>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const [
      totalElevators,
      runningCount,
      stoppedCount,
      faultCount,
      maintenanceCount,
      pendingRepairs,
      todayInspections,
    ] = await Promise.all([
      this.prisma.elevator.count(),
      this.prisma.elevator.count({ where: { status: 'RUNNING' } }),
      this.prisma.elevator.count({ where: { status: 'STOPPED' } }),
      this.prisma.elevator.count({ where: { status: 'FAULT' } }),
      this.prisma.elevator.count({ where: { status: 'MAINTENANCE' } }),
      this.prisma.repairOrder.count({
        where: {
          status: {
            in: ['PENDING_ACCEPT', 'PENDING_REPAIR', 'PENDING_SUPERVISOR', 'PENDING_MANAGER'],
          },
        },
      }),
      this.prisma.inspectionTask.count({
        where: {
          createdAt: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      }),
    ]);

    const result = {
      totalElevators,
      runningCount,
      stoppedCount,
      faultCount,
      maintenanceCount,
      pendingRepairs,
      todayInspections,
    };

    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  async getProjectStats(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: { elevators: true },
        },
      },
    });

    if (!project) {
      return null;
    }

    const elevatorStats = await this.prisma.elevator.groupBy({
      by: ['status'],
      where: { projectId },
      _count: { id: true },
    });

    const repairCounts = await this.prisma.repairOrder.count({
      where: {
        elevator: { projectId },
      },
    });

    const faultRecords = await this.prisma.faultRecord.count({
      where: {
        elevator: { projectId },
      },
    });

    const totalElevators = project._count.elevators;
    const faultRate = totalElevators > 0
      ? parseFloat(((faultRecords / totalElevators) * 100).toFixed(2))
      : 0;

    return {
      projectId: project.id,
      projectName: project.name,
      totalElevators,
      elevatorStats: elevatorStats.reduce(
        (acc, cur) => {
          acc[cur.status] = cur._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
      repairCounts,
      faultRecords,
      faultRate,
    };
  }

  async getRepairTrend(months: number) {
    const cacheKey = CacheService.key('dashboard', 'repair-trend', String(months));
    const cached = await this.cache.get<Array<{ month: string; count: number }>>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const result: Array<{ month: string; count: number }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

      const count = await this.prisma.repairOrder.count({
        where: {
          createdAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      });

      const year = monthStart.getFullYear();
      const month = String(monthStart.getMonth() + 1).padStart(2, '0');
      result.push({
        month: `${year}-${month}`,
        count,
      });
    }

    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getFaultDistribution(projectId?: string) {
    const cacheKey = CacheService.key('dashboard', 'fault-distribution', projectId || 'all');
    const cached = await this.cache.get<{ total: number; distribution: Array<{ faultType: string; count: number; percentage: number }> }>(cacheKey);
    if (cached) return cached;

    const where = projectId
      ? { elevator: { projectId } }
      : {};

    const faultRecords = await this.prisma.faultRecord.groupBy({
      by: ['faultType'],
      where,
      _count: { id: true },
    });

    const total = faultRecords.reduce((sum, r) => sum + r._count.id, 0);

    const result = {
      total,
      distribution: faultRecords.map((r) => ({
        faultType: r.faultType,
        count: r._count.id,
        percentage: total > 0 ? parseFloat(((r._count.id / total) * 100).toFixed(2)) : 0,
      })),
    };

    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getRepairStats() {
    const cacheKey = CacheService.key('dashboard', 'repair-stats');
    const cached = await this.cache.get<{
      urgencyBreakdown: Array<{ urgency: string; count: number; percentage: number }>;
      statusBreakdown: Array<{ status: string; count: number }>;
      completionRate: number;
    }>(cacheKey);
    if (cached) return cached;

    const [urgencyBreakdown, statusBreakdown] = await Promise.all([
      this.prisma.repairOrder.groupBy({
        by: ['urgency'],
        _count: { id: true },
      }),
      this.prisma.repairOrder.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const total = urgencyBreakdown.reduce((sum, r) => sum + r._count.id, 0);
    const resolved = ['RESOLVED', 'CLOSED'].reduce(
      (sum, s) => sum + (statusBreakdown.find((r) => r.status === s)?._count.id ?? 0), 0,
    );

    const result = {
      urgencyBreakdown: urgencyBreakdown.map((r) => ({
        urgency: r.urgency,
        count: r._count.id,
        percentage: total > 0 ? parseFloat(((r._count.id / total) * 100).toFixed(1)) : 0,
      })),
      statusBreakdown: statusBreakdown.map((r) => ({
        status: r.status,
        count: r._count.id,
      })),
      completionRate: total > 0 ? parseFloat(((resolved / total) * 100).toFixed(1)) : 0,
    };

    await this.cache.set(cacheKey, result, 300);
    return result;
  }
}
