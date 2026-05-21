import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { MonthlyFeeService } from '../monthly-fee/monthly-fee.service';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);
  private readonly inspectionWindowDays: number;
  private readonly contractWindowDays: number;
  private readonly maintenancePlanWindowDays: number;

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private monthlyFeeService: MonthlyFeeService,
    private config: ConfigService,
  ) {
    this.inspectionWindowDays = this.config.get<number>('INSPECTION_WINDOW_DAYS', 30);
    this.contractWindowDays = this.config.get<number>('CONTRACT_WINDOW_DAYS', 30);
    this.maintenancePlanWindowDays = this.config.get<number>('MAINTENANCE_PLAN_WINDOW_DAYS', 7);
  }

  // Run daily at 8:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailyChecks() {
    this.logger.log('执行每日定时检查...');
    await Promise.all([
      this.checkUpcomingInspections(),
      this.checkExpiringContracts(),
      this.checkExpiringMaintenancePlans(),
    ]);
    this.logger.log('每日定时检查完成');
  }

  // Also run at 8:00 PM as a fallback
  @Cron('0 20 * * *')
  async handleEveningChecks() {
    await this.handleDailyChecks();
  }

  // Monthly fee auto-generation: 1st of each month at 2:00 AM
  @Cron('0 2 1 * *')
  async generateMonthlyFees() {
    this.logger.log('开始自动生成月费...');
    try {
      const now = new Date();
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const month = now.getMonth() === 0 ? 12 : now.getMonth();
      const result = await this.monthlyFeeService.generate({ year, month });
      this.logger.log(`月费自动生成完成: ${JSON.stringify(result)}`);

      // Notify admin
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      for (const admin of admins) {
        await this.notificationService.createNotification({
          userId: admin.id,
          title: '月费自动生成完成',
          content: `${year}年${month}月月费已自动生成，共 ${result.generated} 条记录`,
          type: 'info',
        });
      }
    } catch (err: any) {
      this.logger.error(`月费自动生成失败: ${err.message}`);
    }
  }

  private async checkUpcomingInspections() {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + this.inspectionWindowDays * 24 * 60 * 60 * 1000);

    const elevators = await this.prisma.elevator.findMany({
      where: {
        nextInspectDate: {
          gte: now,
          lte: windowEnd,
        },
      },
      select: {
        id: true,
        regCode: true,
        nextInspectDate: true,
        customerServiceId: true,
        maintainerId: true,
        safetyOfficerId: true,
        safetyDirectorId: true,
      },
    });

    if (elevators.length === 0) return;

    const userIds = new Set<string>();
    for (const e of elevators) {
      if (e.customerServiceId) userIds.add(e.customerServiceId);
      if (e.maintainerId) userIds.add(e.maintainerId);
      if (e.safetyOfficerId) userIds.add(e.safetyOfficerId);
      if (e.safetyDirectorId) userIds.add(e.safetyDirectorId);
    }

    const daysUntilInspect = (date: Date) =>
      Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

    for (const userId of userIds) {
      const userElevators = elevators.filter(
        (e) =>
          e.customerServiceId === userId ||
          e.maintainerId === userId ||
          e.safetyOfficerId === userId ||
          e.safetyDirectorId === userId,
      );

      const titles = userElevators.map(
        (e) =>
          `电梯 ${e.regCode} 距年检还有${daysUntilInspect(e.nextInspectDate!)}天`,
      );

      await this.notificationService.createNotification({
        userId,
        title: '电梯年检提醒',
        content: `以下电梯即将年检：\n${titles.join('\n')}`,
        type: 'warning',
      });
    }

    this.logger.log(`年检提醒: ${elevators.length}台电梯即将年检`);
  }

  private async checkExpiringContracts() {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + this.contractWindowDays * 24 * 60 * 60 * 1000);

    const contracts = await this.prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: now,
          lte: windowEnd,
        },
      },
      include: {
        maintenanceUnit: { select: { id: true, contactName: true, contactPhone: true } },
      },
    });

    if (contracts.length === 0) return;

    // Notify admin users about expiring contracts
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    for (const admin of admins) {
      const contractDetails = contracts
        .map((c) => `"${c.name}" (${c.contractNo}) 到期日: ${c.endDate?.toLocaleDateString('zh-CN')}`)
        .join('\n');

      await this.notificationService.createNotification({
        userId: admin.id,
        title: `合同到期提醒 (${contracts.length}份)`,
        content: `以下合同即将到期：\n${contractDetails}`,
        type: 'warning',
      });
    }

    this.logger.log(`合同到期提醒: ${contracts.length}份合同即将到期`);
  }

  private async checkExpiringMaintenancePlans() {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + this.maintenancePlanWindowDays * 24 * 60 * 60 * 1000);

    const plans = await this.prisma.maintenancePlan.findMany({
      where: {
        status: 'PENDING',
        planDate: {
          gte: now,
          lte: windowEnd,
        },
      },
      include: {
        elevator: {
          select: { id: true, regCode: true, maintainerId: true, customerServiceId: true },
        },
      },
    });

    if (plans.length === 0) return;

    for (const plan of plans) {
      if (plan.elevator?.maintainerId) {
        await this.notificationService.createNotification({
          userId: plan.elevator.maintainerId,
          title: '维保计划提醒',
          content: `电梯 ${plan.elevator.regCode} 的维保计划 "${plan.planType}" 即将在 ${plan.planDate?.toLocaleDateString('zh-CN')} 执行`,
          type: 'info',
          refId: plan.elevatorId,
        });
      }
    }

    this.logger.log(`维保计划提醒: ${plans.length}个计划即将执行`);
  }
}
