import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateMaintenancePlanDto } from './dto/maintenance-plan.dto';
import * as XLSX from 'xlsx';

@Injectable()
export class MaintenancePlanService {
  private readonly logger = new Logger(MaintenancePlanService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMaintenancePlanDto) {
    const elevator = await this.prisma.elevator.findUnique({ where: { id: dto.elevatorId } });
    if (!elevator) throw new NotFoundException(`电梯 ${dto.elevatorId} 不存在`);

    return this.prisma.maintenancePlan.create({
      data: {
        elevatorId: dto.elevatorId,
        planDate: new Date(dto.planDate),
        planType: dto.planType,
        maintainerId: dto.maintainerId,
        remark: dto.remark,
      },
      include: { elevator: true },
    });
  }

  async findAll(query: {
    elevatorId?: string; status?: string; maintainerId?: string;
    page?: number; limit?: number;
  }) {
    const { elevatorId, status, maintainerId, page = 1, limit = 20 } = query;
    const where: any = {};
    if (elevatorId) where.elevatorId = elevatorId;
    if (status) where.status = status;
    if (maintainerId) where.maintainerId = maintainerId;

    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.maintenancePlan.findMany({
        where, skip, take: limit, orderBy: { planDate: 'desc' },
        include: { elevator: { select: { id: true, regCode: true, brand: true, building: true } } },
      }),
      this.prisma.maintenancePlan.count({ where }),
    ]);
    return { list: items, total, page, limit };
  }

  async findOne(id: string) {
    const plan = await this.prisma.maintenancePlan.findUnique({
      where: { id },
      include: { elevator: true },
    });
    if (!plan) throw new NotFoundException(`维保计划 ${id} 不存在`);
    return plan;
  }

  async updateStatus(id: string, status: string) {
    const plan = await this.prisma.maintenancePlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`维保计划 ${id} 不存在`);
    const data: any = { status };
    if (status === 'COMPLETED') data.completedAt = new Date();
    return this.prisma.maintenancePlan.update({ where: { id }, data });
  }

  async remove(id: string) {
    const plan = await this.prisma.maintenancePlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`维保计划 ${id} 不存在`);
    await this.prisma.maintenancePlan.delete({ where: { id } });
  }

  /**
   * Import maintenance plans from Excel.
   * Expected columns: 电梯注册代码, 计划日期, 计划类型, 维保员ID, 备注
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
    if (!sheetName) {
      throw new BadRequestException('Excel文件没有工作表');
    }

    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    if (!rows || rows.length === 0) {
      throw new BadRequestException('Excel文件没有数据');
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const regCode = String(row['电梯注册代码'] || row['regCode'] || '').trim();
        if (!regCode) {
          errors.push(`第 ${i + 2} 行: 电梯注册代码不能为空`);
          continue;
        }

        const elevator = await this.prisma.elevator.findUnique({ where: { regCode } });
        if (!elevator) {
          errors.push(`第 ${i + 2} 行: 电梯注册代码 "${regCode}" 不存在`);
          continue;
        }

        const planDate = String(row['计划日期'] || row['planDate'] || '').trim();
        if (!planDate) {
          errors.push(`第 ${i + 2} 行: 计划日期不能为空`);
          continue;
        }

        const planDateObj = new Date(planDate);
        if (isNaN(planDateObj.getTime())) {
          errors.push(`第 ${i + 2} 行: 计划日期格式无效 "${planDate}"`);
          continue;
        }

        const planType = String(row['计划类型'] || row['planType'] || 'MONTHLY').trim();
        const validTypes = ['HALF_MONTHLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];
        const resolvedType = validTypes.includes(planType) ? planType : this.resolvePlanType(planType);

        const maintainerId = String(row['维保员ID'] || row['maintainerId'] || '').trim();
        if (!maintainerId) {
          errors.push(`第 ${i + 2} 行: 维保员ID不能为空`);
          continue;
        }

        const remark = String(row['备注'] || row['remark'] || '').trim() || undefined;

        await this.prisma.maintenancePlan.create({
          data: {
            elevatorId: elevator.id,
            planDate: planDateObj,
            planType: resolvedType,
            maintainerId,
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

  /**
   * Resolve a Chinese plan type string to the enum value.
   */
  private resolvePlanType(type: string): string {
    const map: Record<string, string> = {
      '半月保': 'HALF_MONTHLY',
      '半月': 'HALF_MONTHLY',
      '月度保': 'MONTHLY',
      '月度': 'MONTHLY',
      '月保': 'MONTHLY',
      '季度保': 'QUARTERLY',
      '季度': 'QUARTERLY',
      '半年保': 'HALF_YEARLY',
      '半年': 'HALF_YEARLY',
      '年度保': 'YEARLY',
      '年度': 'YEARLY',
      '年保': 'YEARLY',
    };
    return map[type] || type;
  }
}
