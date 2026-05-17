import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateMaintenanceUnitDto } from './dto/create-maintenance-unit.dto';
import { UpdateMaintenanceUnitDto } from './dto/update-maintenance-unit.dto';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class MaintenanceUnitService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMaintenanceUnitDto) {
    return this.prisma.maintenanceUnit.create({ data: dto });
  }

  async findAll(query: { page?: number; limit?: number; name?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { name } = query;
    const where: Prisma.MaintenanceUnitWhereInput = {};
    if (name) where.name = { contains: name };

    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.maintenanceUnit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { contracts: true } } },
      }),
      this.prisma.maintenanceUnit.count({ where }),
    ]);

    return { list: items, total, page, limit };
  }

  async findOne(id: string) {
    const unit = await this.prisma.maintenanceUnit.findUnique({
      where: { id },
      include: {
        contracts: {
          include: { _count: { select: { elevators: true } } },
        },
      },
    });
    if (!unit) throw new NotFoundException(`维保单位 ${id} 不存在`);
    return unit;
  }

  async update(id: string, dto: UpdateMaintenanceUnitDto) {
    const existing = await this.prisma.maintenanceUnit.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`维保单位 ${id} 不存在`);
    return this.prisma.maintenanceUnit.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const existing = await this.prisma.maintenanceUnit.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`维保单位 ${id} 不存在`);
    // Check for related contracts
    const contractCount = await this.prisma.contract.count({ where: { maintenanceUnitId: id } });
    if (contractCount > 0) {
      throw new BadRequestException(
        `该维保单位下仍有 ${contractCount} 份合同，请先删除合同后再删除`,
      );
    }
    await this.prisma.maintenanceUnit.delete({ where: { id } });
  }

  private scoreLevel(score: number): string {
    if (score >= 90) return '优秀';
    if (score >= 75) return '良好';
    if (score >= 60) return '合格';
    return '待改进';
  }

  async calculateScore(id: string) {
    const unit = await this.prisma.maintenanceUnit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException(`维保单位 ${id} 不存在`);

    // Get all contract IDs for this unit
    const contracts = await this.prisma.contract.findMany({
      where: { maintenanceUnitId: id },
      select: { id: true },
    });
    const contractIds = contracts.map((c) => c.id);

    let evalScore = 0;
    let hasEvalData = false;

    if (contractIds.length > 0) {
      // Average of last 12 evaluation scores across all contracts (70% weight)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const evaluations = await this.prisma.contractEvaluation.findMany({
        where: {
          contractId: { in: contractIds },
          month: { gte: twelveMonthsAgo },
        },
        select: { score: true },
      });

      if (evaluations.length > 0) {
        evalScore = evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length;
        hasEvalData = true;
      }

      // Get elevator IDs for all contracts
      const contractElevators = await this.prisma.contractElevator.findMany({
        where: { contractId: { in: contractIds } },
        select: { elevatorId: true },
      });
      const elevatorIds = [...new Set(contractElevators.map((ce) => ce.elevatorId))];

      // Get repair completion rate (30% weight)
      if (elevatorIds.length > 0) {
        const totalRepairs = await this.prisma.repairOrder.count({
          where: { elevatorId: { in: elevatorIds } },
        });
        const completedRepairs = await this.prisma.repairOrder.count({
          where: {
            elevatorId: { in: elevatorIds },
            status: { in: ['RESOLVED', 'CLOSED'] },
          },
        });
        const completionRate = totalRepairs > 0 ? (completedRepairs / totalRepairs) * 100 : 100;

        const finalScore = hasEvalData
          ? Math.round(evalScore * 0.7 + completionRate * 0.3)
          : Math.round(completionRate);

        const level = this.scoreLevel(finalScore);

        // Save score to unit
        await this.prisma.maintenanceUnit.update({
          where: { id },
          data: { score: finalScore, scoreLevel: level },
        });

        return { score: finalScore, scoreLevel: level, evalScore: Math.round(evalScore), completionRate: Math.round(completionRate), hasEvalData };
      }
    }

    // No data at all
    return { score: null, scoreLevel: null, evalScore: 0, completionRate: 0, hasEvalData: false };
  }

  async getScore(id: string) {
    const unit = await this.prisma.maintenanceUnit.findUnique({
      where: { id },
      select: { score: true, scoreLevel: true },
    });
    if (!unit) throw new NotFoundException(`维保单位 ${id} 不存在`);
    return unit;
  }

  async exportToExcel(query: { name?: string }): Promise<Buffer> {
    const { list } = await this.findAll({ ...query, page: 1, limit: 99999 });

    const rows = list.map((u: any) => ({
      '单位名称': u.name,
      '联系人': u.contactName || '',
      '联系电话': u.contactPhone || '',
      '资质等级': u.level || '',
      '合同数': u._count?.contracts ?? 0,
      '综合评分': u.score != null ? `${u.score}分` : '未评分',
      '评分等级': u.scoreLevel || '',
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, '维保单位');
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }
}
