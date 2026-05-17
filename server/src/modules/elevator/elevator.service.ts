import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateElevatorDto } from './dto/create-elevator.dto';
import { UpdateElevatorDto } from './dto/update-elevator.dto';
import { ElevatorQueryDto } from './dto/elevator-query.dto';
import { Elevator, ElevatorStatus, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class ElevatorService {
  private readonly logger = new Logger(ElevatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateElevatorDto): Promise<Elevator> {
    return this.prisma.elevator.create({
      data: {
        regCode: dto.regCode,
        assetNo: dto.assetNo,
        brand: dto.brand,
        model: dto.model,
        floorCount: dto.floorCount,
        capacity: dto.capacity,
        speed: dto.speed,
        installDate: dto.installDate ? new Date(dto.installDate) : undefined,
        lastInspectDate: dto.lastInspectDate
          ? new Date(dto.lastInspectDate)
          : undefined,
        nextInspectDate: dto.nextInspectDate
          ? new Date(dto.nextInspectDate)
          : undefined,
        manufactureNo: dto.manufactureNo,
        status: dto.status ?? ElevatorStatus.RUNNING,
        locationDesc: dto.locationDesc,
        latitude: dto.latitude,
        longitude: dto.longitude,
        projectId: dto.projectId,
        building: dto.building,
        customerServiceId: dto.customerServiceId,
        safetyOfficerId: dto.safetyOfficerId,
        safetyDirectorId: dto.safetyDirectorId,
        maintainerId: dto.maintainerId,
      },
      include: {
        project: true,
        customerService: true,
        safetyOfficer: true,
        safetyDirector: true,
        maintainer: true,
      },
    });
  }

  async findAll(query: ElevatorQueryDto): Promise<{
    list: Elevator[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { projectId, status, building, keyword, page = 1, limit = 20 } = query;

    const where: Prisma.ElevatorWhereInput = {};

    if (projectId) {
      where.projectId = projectId;
    }
    if (status) {
      where.status = status;
    }
    if (building) {
      where.building = { contains: building };
    }
    if (keyword) {
      where.OR = [
        { regCode: { contains: keyword } },
        { building: { contains: keyword } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.elevator.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: true,
          customerService: true,
          safetyOfficer: true,
          safetyDirector: true,
          maintainer: true,
        },
      }),
      this.prisma.elevator.count({ where }),
    ]);

    return { list: items, total, page, limit };
  }

  async findOne(id: string): Promise<Elevator> {
    const elevator = await this.prisma.elevator.findUnique({
      where: { id },
      include: {
        project: true,
        customerService: true,
        safetyOfficer: true,
        safetyDirector: true,
        maintainer: true,
        contracts: {
          include: {
            contract: true,
          },
        },
      },
    });

    if (!elevator) {
      throw new NotFoundException(`电梯 ${id} 不存在`);
    }

    return elevator;
  }

  async update(id: string, dto: UpdateElevatorDto): Promise<Elevator> {
    const existing = await this.prisma.elevator.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`电梯 ${id} 不存在`);
    }

    const data: Prisma.ElevatorUpdateInput = {};

    if (dto.regCode !== undefined) data.regCode = dto.regCode;
    if (dto.assetNo !== undefined) data.assetNo = dto.assetNo;
    if (dto.brand !== undefined) data.brand = dto.brand;
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.floorCount !== undefined) data.floorCount = dto.floorCount;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.speed !== undefined) data.speed = dto.speed;
    if (dto.installDate !== undefined)
      data.installDate = new Date(dto.installDate);
    if (dto.lastInspectDate !== undefined)
      data.lastInspectDate = new Date(dto.lastInspectDate);
    if (dto.nextInspectDate !== undefined)
      data.nextInspectDate = new Date(dto.nextInspectDate);
    if (dto.manufactureNo !== undefined) data.manufactureNo = dto.manufactureNo;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.locationDesc !== undefined) data.locationDesc = dto.locationDesc;
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;
    if (dto.projectId !== undefined) {
      data.project = { connect: { id: dto.projectId } };
    }
    if (dto.building !== undefined) data.building = dto.building;

    // Handle personnel relations
    if (dto.customerServiceId !== undefined) {
      data.customerService =
        dto.customerServiceId === null
          ? { disconnect: true }
          : { connect: { id: dto.customerServiceId } };
    }
    if (dto.safetyOfficerId !== undefined) {
      data.safetyOfficer =
        dto.safetyOfficerId === null
          ? { disconnect: true }
          : { connect: { id: dto.safetyOfficerId } };
    }
    if (dto.safetyDirectorId !== undefined) {
      data.safetyDirector =
        dto.safetyDirectorId === null
          ? { disconnect: true }
          : { connect: { id: dto.safetyDirectorId } };
    }
    if (dto.maintainerId !== undefined) {
      data.maintainer =
        dto.maintainerId === null
          ? { disconnect: true }
          : { connect: { id: dto.maintainerId } };
    }

    const result = await this.prisma.elevator.update({
      where: { id },
      data,
      include: {
        project: true,
        customerService: true,
        safetyOfficer: true,
        safetyDirector: true,
        maintainer: true,
      },
    });
    await this.cache.delPattern('dashboard:*');
    return result;
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.elevator.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`电梯 ${id} 不存在`);
    }

    // Check for active repair orders (should be resolved before removal)
    const activeRepairs = await this.prisma.repairOrder.count({
      where: { elevatorId: id, status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED'] } },
    });
    if (activeRepairs > 0) {
      throw new BadRequestException(
        `电梯仍有 ${activeRepairs} 个未完结的报修单，请先处理后再删除`,
      );
    }

    // Cascade delete related records in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.qRCode.deleteMany({ where: { elevatorId: id } });
      await tx.inspectionTask.deleteMany({ where: { elevatorId: id } });
      await tx.faultRecord.deleteMany({ where: { elevatorId: id } });
      await tx.monthlyFeeItem.deleteMany({ where: { elevatorId: id } });
      await tx.maintenancePlan.deleteMany({ where: { elevatorId: id } });
      await tx.contractElevator.deleteMany({ where: { elevatorId: id } });
      await tx.repairOrder.deleteMany({ where: { elevatorId: id } });
      await tx.elevator.delete({ where: { id } });
    });
    await this.cache.delPattern('dashboard:*');
  }

  async findByProject(projectId: string): Promise<Elevator[]> {
    return this.prisma.elevator.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        project: true,
        customerService: true,
        safetyOfficer: true,
        safetyDirector: true,
        maintainer: true,
      },
    });
  }

  async findUpcomingInspections(): Promise<Elevator[]> {
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(now.getMonth() + 1);

    return this.prisma.elevator.findMany({
      where: {
        nextInspectDate: {
          gte: now,
          lte: oneMonthLater,
        },
      },
      orderBy: { nextInspectDate: 'asc' },
      include: {
        project: true,
        customerService: true,
        safetyOfficer: true,
        safetyDirector: true,
        maintainer: true,
      },
    });
  }

  async importFromExcel(
    file: Express.Multer.File,
  ): Promise<{ imported: number; errors: string[] }> {
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

    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows || rows.length === 0) {
      throw new BadRequestException('Excel文件没有数据');
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const regCode = String(row['注册代码'] || row['regCode'] || '').trim();
        if (!regCode) {
          errors.push(`第 ${i + 2} 行: 注册代码不能为空`);
          continue;
        }

        const statusValue = String(
          row['状态'] || row['status'] || 'RUNNING',
        ).trim();
        const status = this.parseElevatorStatus(statusValue);

        const projectId = String(
          row['项目ID'] || row['projectId'] || '',
        ).trim();
        if (!projectId) {
          errors.push(`第 ${i + 2} 行: 项目ID不能为空`);
          continue;
        }

        await this.prisma.elevator.create({
          data: {
            regCode,
            assetNo: String(row['资产编号'] || row['assetNo'] || '') || null,
            brand: String(row['品牌'] || row['brand'] || '') || null,
            model: String(row['型号'] || row['model'] || '') || null,
            floorCount: Number(row['层站'] || row['floorCount']) || null,
            capacity: Number(row['载重'] || row['capacity']) || null,
            speed: Number(row['速度'] || row['speed']) || null,
            installDate: this.parseExcelDate(row['安装日期'] || row['installDate']),
            lastInspectDate: this.parseExcelDate(
              row['最近年检'] || row['lastInspectDate'],
            ),
            nextInspectDate: this.parseExcelDate(
              row['下次年检'] || row['nextInspectDate'],
            ),
            manufactureNo:
              String(row['出厂编号'] || row['manufactureNo'] || '') || null,
            status,
            locationDesc:
              String(row['位置描述'] || row['locationDesc'] || '') || null,
            latitude: Number(row['纬度'] || row['latitude']) || null,
            longitude: Number(row['经度'] || row['longitude']) || null,
            projectId,
            building: String(row['楼栋'] || row['building'] || '') || null,
            customerServiceId:
              String(
                row['客户服务人员ID'] ||
                  row['customerServiceId'] ||
                  '',
              ).trim() || null,
            safetyOfficerId:
              String(
                row['安全员ID'] || row['safetyOfficerId'] || '',
              ).trim() || null,
            safetyDirectorId:
              String(
                row['安全总监ID'] || row['safetyDirectorId'] || '',
              ).trim() || null,
            maintainerId:
              String(
                row['维保人员ID'] || row['maintainerId'] || '',
              ).trim() || null,
          },
        });

        imported++;
      } catch (error: any) {
        errors.push(
          `第 ${i + 2} 行: ${error.message || '导入失败'}`,
        );
      }
    }

    return { imported, errors };
  }

  async exportToExcel(query: ElevatorQueryDto): Promise<Buffer> {
    const { list } = await this.findAll({
      ...query,
      page: 1,
      limit: 99999,
    });

    const rows = list.map((e) => ({
      '注册代码': e.regCode,
      '资产编号': e.assetNo || '',
      '品牌': e.brand || '',
      '型号': e.model || '',
      '层站': e.floorCount ?? '',
      '载重(kg)': e.capacity ?? '',
      '速度(m/s)': e.speed ?? '',
      '安装日期': e.installDate ? this.formatDate(e.installDate) : '',
      '最近年检': e.lastInspectDate ? this.formatDate(e.lastInspectDate) : '',
      '下次年检': e.nextInspectDate ? this.formatDate(e.nextInspectDate) : '',
      '出厂编号': e.manufactureNo || '',
      '状态': this.formatElevatorStatus(e.status),
      '位置描述': e.locationDesc || '',
      '纬度': e.latitude ?? '',
      '经度': e.longitude ?? '',
      '项目ID': e.projectId,
      '楼栋': e.building || '',
      '客户服务人员ID': e.customerServiceId || '',
      '安全员ID': e.safetyOfficerId || '',
      '安全总监ID': e.safetyDirectorId || '',
      '维保人员ID': e.maintainerId || '',
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, '电梯台账');
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  // ---- Helpers ----

  private parseElevatorStatus(value: string): ElevatorStatus {
    const statusMap: Record<string, ElevatorStatus> = {
      '运行': ElevatorStatus.RUNNING,
      'RUNNING': ElevatorStatus.RUNNING,
      '停止': ElevatorStatus.STOPPED,
      'STOPPED': ElevatorStatus.STOPPED,
      '维保': ElevatorStatus.MAINTENANCE,
      'MAINTENANCE': ElevatorStatus.MAINTENANCE,
      '故障': ElevatorStatus.FAULT,
      'FAULT': ElevatorStatus.FAULT,
    };
    return statusMap[value.toUpperCase()] || ElevatorStatus.RUNNING;
  }

  private parseExcelDate(value: any): Date | null {
    if (!value) return null;
    if (typeof value === 'number') {
      // Excel serial date number
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

  private formatElevatorStatus(status: ElevatorStatus): string {
    const map: Record<ElevatorStatus, string> = {
      [ElevatorStatus.RUNNING]: '运行',
      [ElevatorStatus.STOPPED]: '停止',
      [ElevatorStatus.MAINTENANCE]: '维保',
      [ElevatorStatus.FAULT]: '故障',
    };
    return map[status] || status;
  }
}
