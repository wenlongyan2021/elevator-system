import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractQueryDto } from './dto/contract-query.dto';
import { AddElevatorDto } from './dto/add-elevator.dto';
import { CreatePartDto } from './dto/create-part.dto';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import {
  Contract,
  ContractPart,
  ContractEvaluation,
  ContractStatus,
  Prisma,
} from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContractDto): Promise<Contract> {
    let maintenanceUnitId = dto.maintenanceUnitId;

    // Auto-create maintenance unit if name provided but no ID
    if (!maintenanceUnitId && dto.maintenanceUnit) {
      const unit = await this.prisma.maintenanceUnit.upsert({
        where: { name: dto.maintenanceUnit },
        update: {},
        create: { name: dto.maintenanceUnit },
      });
      maintenanceUnitId = unit.id;
    }

    if (!maintenanceUnitId) {
      throw new BadRequestException('维保单位ID或名称不能为空');
    }

    return this.prisma.contract.create({
      data: {
        contractNo: dto.contractNo,
        name: dto.name,
        maintenanceUnitId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        monthlyPrice: dto.monthlyPrice,
        totalPrice: dto.totalPrice,
        paymentCycle: dto.paymentCycle ?? 'monthly',
        evaluationStd: dto.evaluationStd,
        status: dto.status,
        remark: dto.remark,
        signatory: dto.signatory,
        contactPerson: dto.contactPerson,
        contactPhone: dto.contactPhone,
      },
      include: {
        maintenanceUnit: true,
      },
    });
  }

  async findAll(query: ContractQueryDto): Promise<{
    list: Contract[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      maintenanceUnitId,
      status,
      elevatorId,
      keyword,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.ContractWhereInput = {};

    if (maintenanceUnitId) {
      where.maintenanceUnitId = maintenanceUnitId;
    }
    if (status) {
      where.status = status;
    }
    if (elevatorId) {
      where.elevators = { some: { elevatorId } };
    }
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { contractNo: { contains: keyword } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          maintenanceUnit: true,
          _count: {
            select: {
              elevators: true,
              evaluations: true,
            },
          },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return { list: items, total, page, limit };
  }

  async findOne(id: string): Promise<Contract> {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        maintenanceUnit: true,
        elevators: {
          include: {
            elevator: {
              include: {
                project: true,
              },
            },
          },
        },
        parts: true,
        evaluations: {
          orderBy: { month: 'desc' },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`合同 ${id} 不存在`);
    }

    return contract;
  }

  async update(id: string, dto: UpdateContractDto): Promise<Contract> {
    const existing = await this.prisma.contract.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`合同 ${id} 不存在`);
    }

    const data: Prisma.ContractUpdateInput = {};

    if (dto.contractNo !== undefined) data.contractNo = dto.contractNo;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.maintenanceUnitId !== undefined) {
      data.maintenanceUnit = { connect: { id: dto.maintenanceUnitId } };
    }
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.monthlyPrice !== undefined) data.monthlyPrice = dto.monthlyPrice;
    if (dto.totalPrice !== undefined) data.totalPrice = dto.totalPrice;
    if (dto.paymentCycle !== undefined) data.paymentCycle = dto.paymentCycle;
    if (dto.evaluationStd !== undefined) data.evaluationStd = dto.evaluationStd;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.remark !== undefined) data.remark = dto.remark;

    return this.prisma.contract.update({
      where: { id },
      data,
      include: {
        maintenanceUnit: true,
      },
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.contract.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`合同 ${id} 不存在`);
    }

    // Delete related records in a transaction
    await this.prisma.$transaction([
      this.prisma.contractEvaluation.deleteMany({ where: { contractId: id } }),
      this.prisma.contractPart.deleteMany({ where: { contractId: id } }),
      this.prisma.contractElevator.deleteMany({ where: { contractId: id } }),
      this.prisma.contract.delete({ where: { id } }),
    ]);
  }

  async addElevators(
    id: string,
    dto: AddElevatorDto,
  ): Promise<Contract> {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException(`合同 ${id} 不存在`);
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();

    // Verify elevators exist
    const elevatorCount = await this.prisma.elevator.count({
      where: { id: { in: dto.elevatorIds } },
    });

    if (elevatorCount !== dto.elevatorIds.length) {
      throw new BadRequestException('部分电梯不存在');
    }

    // Create contract-elevator relations (skip duplicates)
    for (const elevatorId of dto.elevatorIds) {
      await this.prisma.contractElevator.upsert({
        where: {
          contractId_elevatorId: {
            contractId: id,
            elevatorId,
          },
        },
        update: {},
        create: {
          contractId: id,
          elevatorId,
          startDate,
        },
      });
    }

    return this.findOne(id);
  }

  async removeElevator(
    contractId: string,
    elevatorId: string,
  ): Promise<Contract> {
    const relation = await this.prisma.contractElevator.findUnique({
      where: {
        contractId_elevatorId: {
          contractId,
          elevatorId,
        },
      },
    });

    if (!relation) {
      throw new NotFoundException('该电梯未关联到此合同');
    }

    await this.prisma.contractElevator.delete({
      where: {
        contractId_elevatorId: {
          contractId,
          elevatorId,
        },
      },
    });

    return this.findOne(contractId);
  }

  async addPart(contractId: string, dto: CreatePartDto): Promise<ContractPart> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException(`合同 ${contractId} 不存在`);
    }

    return this.prisma.contractPart.create({
      data: {
        contractId,
        type: dto.type,
        name: dto.name,
        model: dto.model,
        unit: dto.unit ?? '个',
        quantity: dto.quantity ?? 1,
        price: dto.price,
        remark: dto.remark,
      },
    });
  }

  async updatePart(
    contractId: string,
    partId: string,
    dto: CreatePartDto,
  ): Promise<ContractPart> {
    const part = await this.prisma.contractPart.findFirst({
      where: { id: partId, contractId },
    });
    if (!part) {
      throw new NotFoundException(`配件 ${partId} 不存在`);
    }

    const data: Prisma.ContractPartUpdateInput = {};
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.remark !== undefined) data.remark = dto.remark;

    return this.prisma.contractPart.update({
      where: { id: partId },
      data,
    });
  }

  async getParts(contractId: string): Promise<ContractPart[]> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException(`合同 ${contractId} 不存在`);
    }

    return this.prisma.contractPart.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deletePart(contractId: string, partId: string): Promise<void> {
    const part = await this.prisma.contractPart.findFirst({
      where: { id: partId, contractId },
    });

    if (!part) {
      throw new NotFoundException(`配件 ${partId} 不存在`);
    }

    await this.prisma.contractPart.delete({ where: { id: partId } });
  }

  async addEvaluation(
    contractId: string,
    dto: CreateEvaluationDto,
  ): Promise<ContractEvaluation> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException(`合同 ${contractId} 不存在`);
    }

    return this.prisma.contractEvaluation.create({
      data: {
        contractId,
        month: new Date(dto.month),
        score: dto.score,
        content: dto.content,
        evaluator: dto.evaluator,
        remark: dto.remark,
      },
    });
  }

  async updateEvaluation(
    contractId: string,
    evalId: string,
    dto: CreateEvaluationDto,
  ): Promise<ContractEvaluation> {
    const ev = await this.prisma.contractEvaluation.findFirst({
      where: { id: evalId, contractId },
    });
    if (!ev) {
      throw new NotFoundException(`考核记录 ${evalId} 不存在`);
    }

    const data: Prisma.ContractEvaluationUpdateInput = {};
    if (dto.month !== undefined) data.month = new Date(dto.month);
    if (dto.score !== undefined) data.score = dto.score;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.evaluator !== undefined) data.evaluator = dto.evaluator;
    if (dto.remark !== undefined) data.remark = dto.remark;

    return this.prisma.contractEvaluation.update({
      where: { id: evalId },
      data,
    });
  }

  async deleteEvaluation(
    contractId: string,
    evalId: string,
  ): Promise<void> {
    const ev = await this.prisma.contractEvaluation.findFirst({
      where: { id: evalId, contractId },
    });
    if (!ev) {
      throw new NotFoundException(`考核记录 ${evalId} 不存在`);
    }
    await this.prisma.contractEvaluation.delete({ where: { id: evalId } });
  }

  async getEvaluations(contractId: string): Promise<ContractEvaluation[]> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException(`合同 ${contractId} 不存在`);
    }

    return this.prisma.contractEvaluation.findMany({
      where: { contractId },
      orderBy: { month: 'desc' },
    });
  }

  /**
   * Import contracts from Excel.
   * Expected columns: 合同编号, 合同名称, 维保单位, 签约起始日, 签约结束日, 台/月单价, 合同总价, 付款周期, 状态, 备注
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
        const contractNo = String(row['合同编号'] || row['contractNo'] || '').trim();
        if (!contractNo) {
          errors.push(`第 ${i + 2} 行: 合同编号不能为空`);
          continue;
        }

        const name = String(row['合同名称'] || row['name'] || '').trim();
        if (!name) {
          errors.push(`第 ${i + 2} 行: 合同名称不能为空`);
          continue;
        }

        const unitName = String(row['维保单位'] || row['maintenanceUnit'] || row['maintenanceUnitId'] || '').trim();
        if (!unitName) {
          errors.push(`第 ${i + 2} 行: 维保单位不能为空`);
          continue;
        }

        let maintenanceUnitId = unitName;
        // Try to find by name first
        const unit = await this.prisma.maintenanceUnit.findUnique({ where: { name: unitName } });
        if (unit) {
          maintenanceUnitId = unit.id;
        } else {
          // Check if it's already an ID
          const unitById = await this.prisma.maintenanceUnit.findUnique({ where: { id: unitName } });
          if (!unitById) {
            errors.push(`第 ${i + 2} 行: 维保单位 "${unitName}" 不存在`);
            continue;
          }
        }

        const startDate = this.parseExcelDate(row['签约起始日'] || row['startDate']);
        if (!startDate) {
          errors.push(`第 ${i + 2} 行: 签约起始日不能为空`);
          continue;
        }

        const endDate = this.parseExcelDate(row['签约结束日'] || row['endDate']);
        if (!endDate) {
          errors.push(`第 ${i + 2} 行: 签约结束日不能为空`);
          continue;
        }

        const monthlyPrice = Number(row['台/月单价'] || row['monthlyPrice'] || 0);
        const totalPrice = Number(row['合同总价'] || row['totalPrice'] || 0);

        const paymentCycleRaw = String(row['付款周期'] || row['paymentCycle'] || 'monthly').trim();
        const paymentCycle = paymentCycleRaw === '月付' ? 'monthly'
          : paymentCycleRaw === '季付' ? 'quarterly'
          : paymentCycleRaw === '年付' ? 'yearly'
          : paymentCycleRaw;

        const statusRaw = String(row['状态'] || row['status'] || 'ACTIVE').trim();
        const status = statusRaw === 'ACTIVE' ? ContractStatus.ACTIVE
          : statusRaw === 'EXPIRED' ? ContractStatus.EXPIRED
          : statusRaw === 'TERMINATED' ? ContractStatus.TERMINATED
          : ContractStatus.ACTIVE;

        const remark = String(row['备注'] || row['remark'] || '').trim() || undefined;

        await this.prisma.contract.create({
          data: {
            contractNo,
            name,
            maintenanceUnitId,
            startDate,
            endDate,
            monthlyPrice,
            totalPrice,
            paymentCycle,
            status,
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

  async exportToExcel(query: ContractQueryDto): Promise<Buffer> {
    const { list } = await this.findAll({ ...query, page: 1, limit: 99999 });

    const rows = list.map((c) => ({
      '合同编号': c.contractNo,
      '合同名称': c.name,
      '维保单位': (c as any).maintenanceUnit?.name || '',
      '签约起始日': this.formatDate(c.startDate),
      '签约结束日': this.formatDate(c.endDate),
      '台/月单价': Number(c.monthlyPrice),
      '合同总价': Number(c.totalPrice),
      '付款周期': c.paymentCycle === 'monthly' ? '月付' : c.paymentCycle === 'quarterly' ? '季付' : '年付',
      '状态': c.status === 'ACTIVE' ? '有效' : c.status === 'EXPIRED' ? '已到期' : '已终止',
      '备注': c.remark || '',
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, '合同管理');
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  private parseExcelDate(value: any): Date | null {
    if (!value) return null;
    if (typeof value === 'number') {
      return new Date((value - 25569) * 86400 * 1000);
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
