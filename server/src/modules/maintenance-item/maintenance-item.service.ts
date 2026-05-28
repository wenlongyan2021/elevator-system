import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class MaintenanceItemService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all maintenance items for a specific plan type.
   */
  async findByPlanType(planType: string) {
    return this.prisma.maintenanceItem.findMany({
      where: { planType },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  /**
   * Get all items grouped by category for a plan type.
   */
  async findGroupedByCategory(planType: string) {
    const items = await this.prisma.maintenanceItem.findMany({
      where: { planType },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    const grouped: Record<string, any[]> = {};
    for (const item of items) {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    }
    return grouped;
  }

  /**
   * Get plan types with item counts.
   */
  async getPlanTypeSummary() {
    const types = ['HALF_MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];
    const summary: Record<string, { count: number; categories: string[] }> = {};
    for (const pt of types) {
      const items = await this.prisma.maintenanceItem.findMany({ where: { planType: pt } });
      const cats = [...new Set(items.map(i => i.category))];
      summary[pt] = { count: items.length, categories: cats };
    }
    return summary;
  }
}