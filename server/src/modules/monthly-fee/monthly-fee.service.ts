import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class MonthlyFeeService {
  private readonly logger = new Logger(MonthlyFeeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generate(dto: { maintenanceUnitId?: string; year?: number; month?: number }) {
    const now = new Date();
    const year = dto.year || now.getFullYear();
    const month = dto.month || now.getMonth() + 1;
    const yearMonth = new Date(year, month - 1, 1);

    const where: any = {
      status: 'ACTIVE',
      startDate: { lte: yearMonth },
      endDate: { gte: yearMonth },
    };
    if (dto.maintenanceUnitId) where.maintenanceUnitId = dto.maintenanceUnitId;

    const contracts = await this.prisma.contract.findMany({
      where,
      include: {
        elevators: {
          include: { elevator: { select: { id: true, projectId: true } } },
        },
      },
    });

    if (contracts.length === 0) {
      return { generated: 0, message: '没有找到有效合同' };
    }

    // Group by maintenance unit, deduplicating elevators across overlapping contracts
    const grouped = new Map<string, {
      unitPrice: number;
      elevatorCount: number;
      elevators: Map<string, { elevatorId: string; projectId: string; monthlyPrice: number }>;
    }>();
    for (const c of contracts) {
      const price = Number(c.monthlyPrice);
      for (const ce of c.elevators) {
        let group = grouped.get(c.maintenanceUnitId);
        if (!group) {
          group = { unitPrice: price, elevatorCount: 0, elevators: new Map() };
          grouped.set(c.maintenanceUnitId, group);
        }
        // Deduplicate: only add if elevatorId not already in the map
        if (!group.elevators.has(ce.elevatorId)) {
          group.elevators.set(ce.elevatorId, {
            elevatorId: ce.elevatorId,
            projectId: ce.elevator.projectId,
            monthlyPrice: price,
          });
          group.elevatorCount++;
        }
      }
    }

    let generated = 0;
    for (const [unitId, data] of grouped) {
      const uniqueElevators = Array.from(data.elevators.values());
      const totalAmount = uniqueElevators.reduce((sum, ev) => sum + ev.monthlyPrice, 0);
      const projectId = uniqueElevators[0]?.projectId || '';

      // Use transaction to ensure fee + items are created atomically
      await this.prisma.$transaction(async (tx) => {
        const fee = await tx.monthlyFee.upsert({
          where: { maintenanceUnitId_yearMonth: { maintenanceUnitId: unitId, yearMonth } },
          update: {
            elevatorCount: data.elevatorCount,
            unitPrice: data.unitPrice,
            totalAmount,
            projectId,
          },
          create: {
            maintenanceUnitId: unitId,
            projectId,
            yearMonth,
            elevatorCount: data.elevatorCount,
            unitPrice: data.unitPrice,
            totalAmount,
          },
        });

        // Sync items: delete old items and create per unique elevator
        await tx.monthlyFeeItem.deleteMany({ where: { monthlyFeeId: fee.id } });
        for (const ev of uniqueElevators) {
          await tx.monthlyFeeItem.create({
            data: {
              monthlyFeeId: fee.id,
              elevatorId: ev.elevatorId,
              costType: 'CONTRACT_IN',
              amount: ev.monthlyPrice,
              description: `维保月费 ${year}年${month}月`,
            },
          });
        }
      });

      generated++;
    }

    this.logger.log(`Generated ${generated} monthly fees for ${year}-${month}`);
    return { generated, year, month };
  }

  async findAll(query: {
    maintenanceUnitId?: string; projectId?: string; status?: string;
    page?: number; limit?: number;
  }) {
    const { maintenanceUnitId, projectId, status, page = 1, limit = 20 } = query;
    const where: any = {};
    if (maintenanceUnitId) where.maintenanceUnitId = maintenanceUnitId;
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.monthlyFee.findMany({ where, skip, take: limit, orderBy: { yearMonth: 'desc' } }),
      this.prisma.monthlyFee.count({ where }),
    ]);
    return { list: items, total, page, limit };
  }

  async findOne(id: string) {
    const fee = await this.prisma.monthlyFee.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            elevator: { select: { id: true, regCode: true, building: true } },
          },
        },
      },
    });
    if (!fee) throw new NotFoundException(`月费记录 ${id} 不存在`);
    return fee;
  }

  async updateStatus(id: string, status: string) {
    const fee = await this.prisma.monthlyFee.findUnique({ where: { id } });
    if (!fee) throw new NotFoundException(`月费记录 ${id} 不存在`);
    return this.prisma.monthlyFee.update({ where: { id }, data: { status } });
  }

  /**
   * Import monthly fees from Excel.
   * Expected columns: 维保单位, 年月, 电梯数量, 台/月单价, 应付总额, 状态, 备注
   */
  async importFromExcel(file: Express.Multer.File): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('无法解析Excel文件，请检查文件格式');
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('Excel文件没有工作表');

    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    if (!rows || rows.length === 0) throw new BadRequestException('Excel文件没有数据');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const unitName = String(row['维保单位'] || row['maintenanceUnit'] || '').trim();
        if (!unitName) {
          errors.push(`第 ${i + 2} 行: 维保单位不能为空`);
          continue;
        }

        const unit = await this.prisma.maintenanceUnit.findUnique({ where: { name: unitName } });
        if (!unit) {
          errors.push(`第 ${i + 2} 行: 维保单位 "${unitName}" 不存在`);
          continue;
        }

        const ymStr = String(row['年月'] || row['yearMonth'] || '').trim();
        if (!ymStr) {
          errors.push(`第 ${i + 2} 行: 年月不能为空`);
          continue;
        }
        const parts = ymStr.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1] || parts[0], 10);
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
          errors.push(`第 ${i + 2} 行: 年月格式无效 "${ymStr}"`);
          continue;
        }
        const yearMonth = new Date(year, month - 1, 1);

        const elevatorCount = Number(row['电梯数量'] || row['elevatorCount'] || 0);
        const unitPrice = Number(row['台/月单价'] || row['unitPrice'] || 0);
        const totalAmount = Number(row['应付总额'] || row['totalAmount'] || 0);

        const statusValue = String(row['状态'] || row['status'] || 'PENDING').trim();
        const resolvedStatus = statusValue === '待确认' ? 'PENDING'
          : statusValue === '已确认' ? 'CONFIRMED'
          : statusValue === '已付款' ? 'PAID'
          : statusValue;

        const remark = String(row['备注'] || row['remark'] || '').trim() || undefined;

        await this.prisma.monthlyFee.upsert({
          where: { maintenanceUnitId_yearMonth: { maintenanceUnitId: unit.id, yearMonth } },
          update: { elevatorCount, unitPrice, totalAmount, status: resolvedStatus, remark },
          create: {
            maintenanceUnitId: unit.id,
            projectId: '',
            yearMonth,
            elevatorCount,
            unitPrice,
            totalAmount,
            status: resolvedStatus,
            remark,
          },
        });

        imported++;
      } catch (error: any) {
        errors.push(`第 ${i + 2} 行: ${error.message || '导入失败'}`);
      }
    }

    return { imported, errors };
  }

  async exportToExcel(query: {
    maintenanceUnitId?: string; projectId?: string; status?: string;
    page?: number; limit?: number;
  }): Promise<Buffer> {
    // Export all matching records (up to 99999)
    const { list } = await this.findAll({ ...query, page: 1, limit: 99999 });

    const rows = list.map((f) => {
      const d = new Date(f.yearMonth);
      const monthLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const statusLabel = f.status === 'PENDING' ? '待确认' : f.status === 'CONFIRMED' ? '已确认' : '已付款';
      return {
        '年月': monthLabel,
        '电梯数量': f.elevatorCount,
        '台/月单价': Number(f.unitPrice),
        '应付总额': Number(f.totalAmount),
        '维修费合计': Number(f.repairCostTotal || 0),
        '状态': statusLabel,
      };
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, '月费管理');
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }
}
