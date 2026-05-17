import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RepairStatus, Urgency, CostType } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { WorkflowService } from '../workflow/workflow.service';
import * as path from 'path';
import * as fs from 'fs';
import { CreateRepairDto } from './dto/create-repair.dto';
import { RepairQueryDto } from './dto/repair-query.dto';
import { CompleteRepairDto } from './dto/complete-repair.dto';
import { AddPartDto } from './dto/add-part.dto';
import { AddCostDto } from './dto/add-cost.dto';
import * as docx from 'docx';
import * as XLSX from 'xlsx';

@Injectable()
export class RepairService {
  private readonly logger = new Logger(RepairService.name);
  private readonly uploadDir: string;

  // Allowed MIME types for repair media uploads
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
  ];

  // State-machine transition table
  private readonly VALID_TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
    [RepairStatus.PENDING_ACCEPT]: [RepairStatus.PENDING_REPAIR, RepairStatus.REJECTED],
    [RepairStatus.PENDING_REPAIR]: [RepairStatus.PENDING_PARTS_VERIFY, RepairStatus.PENDING_SUPERVISOR],
    [RepairStatus.PENDING_PARTS_VERIFY]: [RepairStatus.PENDING_SUPERVISOR, RepairStatus.REJECTED],
    [RepairStatus.PENDING_SUPERVISOR]: [RepairStatus.PENDING_MANAGER, RepairStatus.REJECTED],
    [RepairStatus.PENDING_MANAGER]: [RepairStatus.APPROVED, RepairStatus.PENDING_FUND_REVIEW, RepairStatus.REJECTED],
    [RepairStatus.PENDING_FUND_REVIEW]: [RepairStatus.PENDING_MANAGER],
    [RepairStatus.APPROVED]: [RepairStatus.RESOLVED],
    [RepairStatus.RESOLVED]: [RepairStatus.CLOSED],
    [RepairStatus.REJECTED]: [],
    [RepairStatus.CLOSED]: [],
  };

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private workflowService: WorkflowService,
  ) {
    this.uploadDir = path.join(process.cwd(), 'uploads/repairs');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Auto-generate order number: BX + yyyyMMdd + 4-digit sequence
   */
  private async generateOrderNo(): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateStr = `${y}${m}${d}`;
    const prefix = `BX${dateStr}`;

    const lastOrder = await this.prisma.repairOrder.findFirst({
      where: { orderNo: { startsWith: prefix } },
      orderBy: { orderNo: 'desc' },
    });

    let seq = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.orderNo.slice(-4), 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  /**
   * Create a repair order with auto-generated order number,
   * linked elevator and reporter.
   */
  async createRepair(dto: CreateRepairDto) {
    const orderNo = await this.generateOrderNo();
    const repair = await this.prisma.repairOrder.create({
      data: {
        orderNo,
        elevatorId: dto.elevatorId,
        reporterId: dto.reporterId!,
        stopType: dto.stopType,
        urgency: dto.urgency || Urgency.NORMAL,
        description: dto.description,
        status: RepairStatus.PENDING_ACCEPT,
      },
      include: {
        elevator: {
          include: { project: { select: { id: true, name: true } } },
        },
        reporter: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    });

    // Notify the elevator's maintainer and customer service about the new repair
    const notifyUserIds = [repair.elevator.maintainerId, repair.elevator.customerServiceId].filter(Boolean) as string[];
    for (const userId of notifyUserIds) {
      await this.notificationService.createNotification({
        userId,
        title: '新报修单',
        content: `电梯 ${repair.elevator.regCode} 有新的报修单 (${orderNo})`,
        type: 'REPAIR',
        refId: repair.id,
      });
    }

    // Create workflow instance for the repair
    await this.workflowService.createWorkflow(repair.id).catch((err) => {
      this.logger.warn(`创建工作流失败: ${err.message}`);
    });

    return repair;
  }

  /**
   * Get repairs with pagination, filterable by projectId, elevatorId, status.
   */
  async findRepairs(params: RepairQueryDto) {
    const { projectId, elevatorId, status, hasWorkflow, page = 1, limit = 10 } = params;
    const where: any = {};

    if (elevatorId) {
      where.elevatorId = elevatorId;
    }
    if (status) {
      where.status = status;
    }
    if (projectId) {
      where.elevator = { projectId };
    }
    if (hasWorkflow) {
      where.workflow = { isNot: null };
    }

    const [items, total] = await Promise.all([
      this.prisma.repairOrder.findMany({
        where,
        include: {
          elevator: true,
          reporter: {
            select: { id: true, name: true, phone: true, avatar: true },
          },
          assignee: {
            select: { id: true, name: true, phone: true, avatar: true },
          },
          mediaFiles: true,
          parts: true,
          workflow: {
            select: { id: true, currentStep: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.repairOrder.count({ where }),
    ]);

    return {
      list: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all repair orders for a specific elevator.
   */
  async findRepairsByElevator(elevatorId: string) {
    return this.prisma.repairOrder.findMany({
      where: { elevatorId },
      include: {
        reporter: { select: { id: true, name: true, phone: true } },
        assignee: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single repair order with full details.
   */
  async findRepairById(id: string) {
    const repair = await this.prisma.repairOrder.findUnique({
      where: { id },
      include: {
        elevator: {
          include: {
            project: { select: { id: true, name: true } },
          },
        },
        reporter: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
        mediaFiles: true,
        parts: { orderBy: { createdAt: 'desc' } },
        costs: { orderBy: { createdAt: 'desc' } },
        workflow: {
          include: {
            nodes: { orderBy: { createdAt: 'asc' } },
            materials: true,
          },
        },
      },
    });

    if (!repair) {
      throw new NotFoundException('报修单不存在');
    }

    return repair;
  }

  /**
   * Accept a repair order by a maintainer.
   * Transitions status from PENDING_ACCEPT to PENDING_REPAIR.
   */
  async acceptRepair(id: string, assigneeId: string) {
    const repair = await this.prisma.repairOrder.findUnique({
      where: { id },
    });

    if (!repair) {
      throw new NotFoundException('报修单不存在');
    }
    if (repair.status !== RepairStatus.PENDING_ACCEPT) {
      throw new BadRequestException('当前状态不可接单');
    }

    const result = await this.prisma.repairOrder.update({
      where: { id },
      data: {
        assigneeId,
        status: RepairStatus.PENDING_REPAIR,
      },
      include: {
        elevator: true,
        assignee: { select: { id: true, name: true, phone: true } },
      },
    });

    // Notify the reporter that their repair has been accepted
    if (repair.reporterId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: assigneeId },
        select: { name: true },
      });
      await this.notificationService.createNotification({
        userId: repair.reporterId,
        title: '报修已接单',
        content: `您的报修单 (${repair.orderNo}) 已被 ${assignee?.name || '维保员'} 接单`,
        type: 'REPAIR',
        refId: id,
      });
    }

    return result;
  }

  /**
   * Submit the repair result. Optionally associates parts records.
   * - If isPartsNeeded = true, status goes to PENDING_PARTS_VERIFY.
   * - Otherwise, status goes to PENDING_SUPERVISOR.
   */
  async completeRepair(id: string, dto: CompleteRepairDto) {
    const repair = await this.prisma.repairOrder.findUnique({
      where: { id },
    });

    if (!repair) {
      throw new NotFoundException('报修单不存在');
    }
    if (repair.status !== RepairStatus.PENDING_REPAIR) {
      throw new BadRequestException('当前状态不可提交维修结果');
    }

    const nextStatus = dto.isPartsNeeded
      ? RepairStatus.PENDING_PARTS_VERIFY
      : RepairStatus.PENDING_SUPERVISOR;

    // Use transaction to atomically create parts and update repair
    const result = await this.prisma.$transaction(async (tx) => {
      // Create parts records if provided
      if (dto.parts && dto.parts.length > 0) {
        await tx.repairPart.createMany({
          data: dto.parts.map((p) => ({
            repairId: id,
            partName: p.partName,
            partModel: p.partModel,
            quantity: p.quantity || 1,
            price: p.price || 0,
            costType: (p.costType as CostType) || CostType.CONTRACT_IN,
            remark: p.remark,
          })),
        });
      }

      return tx.repairOrder.update({
        where: { id },
        data: {
          isPartsNeeded: dto.isPartsNeeded ?? false,
          resolveNote: dto.resolveNote,
          status: nextStatus,
          completedAt: dto.isPartsNeeded ? null : new Date(),
        },
        include: {
          elevator: true,
          reporter: { select: { id: true, name: true, phone: true } },
          assignee: { select: { id: true, name: true, phone: true } },
          parts: true,
        },
      });
    });

    return result;
  }

  /**
   * Directly update the repair order status.
   * Enforces the state-machine transition table.
   */
  async updateStatus(id: string, status: RepairStatus) {
    const repair = await this.prisma.repairOrder.findUnique({
      where: { id },
    });

    if (!repair) {
      throw new NotFoundException('报修单不存在');
    }
    if (repair.status === status) {
      return repair;
    }

    // Validate state transition
    const allowed = this.VALID_TRANSITIONS[repair.status as RepairStatus];
    if (!allowed || !allowed.includes(status)) {
      throw new BadRequestException(
        `非法状态流转: ${repair.status} -> ${status}`,
      );
    }

    const updateData: any = { status };
    if (status === RepairStatus.RESOLVED) {
      updateData.completedAt = new Date();
    }

    const result = await this.prisma.repairOrder.update({
      where: { id },
      data: updateData,
    });

    // Notify the reporter about status changes
    if (repair.reporterId) {
      const labels: Record<string, string> = {
        APPROVED: '已批准',
        RESOLVED: '已修复',
        REJECTED: '已驳回',
        CLOSED: '已完结',
      };
      const label = labels[status] || status;
      if (label) {
        await this.notificationService.createNotification({
          userId: repair.reporterId,
          title: `报修状态更新`,
          content: `您的报修单 (${repair.orderNo}) 状态已变更为: ${label}`,
          type: 'REPAIR',
          refId: id,
        });
      }
    }

    return result;
  }

  /**
   * Upload a media file (image or video) for a repair order.
   * For images, generates a 300x300 thumbnail using sharp.
   */
  async uploadMedia(id: string, file: Express.Multer.File) {
    const repair = await this.prisma.repairOrder.findUnique({
      where: { id },
    });

    if (!repair) {
      throw new NotFoundException('报修单不存在');
    }

    // Validate MIME type whitelist
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `不支持的文件类型: ${file.mimetype}，仅允许图片(jpg/png/gif/webp)和视频(mp4/mov/avi)`,
      );
    }

    const isImage = file.mimetype.startsWith('image/');
    const fileType = isImage ? 'IMAGE' : 'VIDEO';

    // Generate unique filename and persist to disk
    const ext = path.extname(file.originalname) || '';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const destPath = path.join(this.uploadDir, uniqueName);

    // Move the temp file to the target location
    if (file.path && file.path !== destPath) {
      await fs.promises.rename(file.path, destPath);
    } else if (file.buffer) {
      await fs.promises.writeFile(destPath, file.buffer);
    }

    let thumbnail: string | null = null;

    // Generate thumbnail for images using sharp
    if (isImage) {
      try {
        const sharpModule = await import('sharp');
        const thumbName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}_thumb${ext}`;
        const thumbPath = path.join(this.uploadDir, thumbName);
        await sharpModule.default(destPath)
          .resize(300, 300, { fit: 'cover' })
          .toFile(thumbPath);
        thumbnail = thumbPath;
      } catch (err: any) {
        this.logger.warn(`缩略图生成失败: ${err.message}`);
      }
    }

    return this.prisma.repairMedia.create({
      data: {
        repairId: id,
        fileType,
        filePath: destPath,
        thumbnail,
        fileSize: file.size || 0,
      },
    });
  }

  /**
   * List all media files for a repair order.
   */
  async findMedia(id: string) {
    return this.prisma.repairMedia.findMany({
      where: { repairId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Add a part record to a repair order.
   */
  async addPart(id: string, dto: AddPartDto) {
    const repair = await this.prisma.repairOrder.findUnique({
      where: { id },
    });

    if (!repair) {
      throw new NotFoundException('报修单不存在');
    }

    return this.prisma.repairPart.create({
      data: {
        repairId: id,
        partName: dto.partName,
        partModel: dto.partModel,
        quantity: dto.quantity || 1,
        price: dto.price || 0,
        costType: (dto.costType as CostType) || CostType.CONTRACT_IN,
        remark: dto.remark,
      },
    });
  }

  /**
   * List all parts for a repair order.
   */
  async findParts(id: string) {
    return this.prisma.repairPart.findMany({
      where: { repairId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List all cost records for a repair order.
   */
  async findCosts(id: string) {
    return this.prisma.repairCost.findMany({
      where: { repairId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Add a cost record to a repair order.
   */
  async addCost(id: string, dto: AddCostDto) {
    const repair = await this.prisma.repairOrder.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!repair) {
      throw new NotFoundException('报修单不存在');
    }
    return this.prisma.repairCost.create({
      data: {
        repairId: id,
        costType: dto.costType,
        amount: dto.amount,
        description: dto.description,
      },
    });
  }

  /**
   * Update a cost record.
   */
  async updateCost(id: string, costId: string, dto: Partial<AddCostDto>) {
    const cost = await this.prisma.repairCost.findFirst({
      where: { id: costId, repairId: id },
    });
    if (!cost) {
      throw new NotFoundException(`费用记录 ${costId} 不存在`);
    }
    return this.prisma.repairCost.update({
      where: { id: costId },
      data: {
        costType: dto.costType,
        amount: dto.amount,
        description: dto.description,
      },
    });
  }

  /**
   * Delete a cost record.
   */
  async deleteCost(id: string, costId: string) {
    const cost = await this.prisma.repairCost.findFirst({
      where: { id: costId, repairId: id },
    });
    if (!cost) {
      throw new NotFoundException(`费用记录 ${costId} 不存在`);
    }
    await this.prisma.repairCost.delete({ where: { id: costId } });
  }

  /**
   * Get parts usage statistics, aggregated by part name & model.
   */
  async getPartsStats(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const parts = await this.prisma.repairPart.groupBy({
      by: ['partName', 'partModel'],
      where,
      _sum: { quantity: true, price: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const totalQuantity = parts.reduce((s, p) => s + (p._sum.quantity || 0), 0);

    return parts.map((p) => ({
      partName: p.partName,
      partModel: p.partModel,
      totalQuantity: p._sum.quantity || 0,
      totalCost: Number(p._sum.price || 0) * (p._sum.quantity || 0),
      useCount: p._count.id,
      percentage: totalQuantity > 0 ? parseFloat((((p._sum.quantity || 0) / totalQuantity) * 100).toFixed(1)) : 0,
    }));
  }

  /**
   * Generate a multi-sheet repair statistics Excel report.
   */
  async generateReportExcel(year?: number, month?: number): Promise<Buffer> {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth() + 1;

    // Date range for the selected month
    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 1);

    // Fetch data
    const [totalRepairs, completedRepairs, urgencyStats, faultStats, costAgg] = await Promise.all([
      this.prisma.repairOrder.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      this.prisma.repairOrder.count({
        where: {
          createdAt: { gte: monthStart, lt: monthEnd },
          status: { in: ['RESOLVED', 'CLOSED'] },
        },
      }),
      this.prisma.repairOrder.groupBy({
        by: ['urgency'],
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
        _count: { id: true },
      }),
      this.prisma.faultRecord.groupBy({
        by: ['faultType'],
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
        _count: { id: true },
      }),
      this.prisma.repairCost.aggregate({
        _sum: { amount: true },
        where: {
          repair: { createdAt: { gte: monthStart, lt: monthEnd } },
        },
      }),
    ]);

    const completionRate = totalRepairs > 0
      ? parseFloat(((completedRepairs / totalRepairs) * 100).toFixed(1))
      : 0;

    const urgencyLabels: Record<string, string> = { EMERGENCY: '紧急', NORMAL: '普通', LOW: '一般' };
    const faultTypeLabels: Record<string, string> = {
      DOOR_FAULT: '门系统故障', TRACTION_FAULT: '曳引系统', CONTROL_FAULT: '控制系统',
      SAFETY_FAULT: '安全保护', TRAPPED: '困人', OTHER: '其他',
    };

    // --- Sheet 1: Summary ---
    const summaryRows = [
      { '统计指标': '本月报修总数', '数值': totalRepairs },
      { '统计指标': '已完成数量', '数值': completedRepairs },
      { '统计指标': '完成率(%)', '数值': completionRate },
      { '统计指标': '维修费用合计(元)', '数值': Number(costAgg._sum.amount || 0).toFixed(2) },
      ...urgencyStats.map((u) => ({
        '统计指标': `${urgencyLabels[u.urgency] || u.urgency}数量`,
        '数值': u._count.id,
      })),
    ];

    // --- Sheet 2: Fault distribution ---
    const faultTotal = faultStats.reduce((s, r) => s + r._count.id, 0);
    const faultRows = faultStats.map((f) => ({
      '故障类型': faultTypeLabels[f.faultType] || f.faultType,
      '数量': f._count.id,
      '占比(%)': faultTotal > 0 ? parseFloat(((f._count.id / faultTotal) * 100).toFixed(1)) : 0,
    }));

    // --- Sheet 3: Monthly trend (last 12 months) ---
    const trendRows: Array<{ month: string; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(targetYear, targetMonth - 1 - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const count = await this.prisma.repairOrder.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      trendRows.push({
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        count,
      });
    }

    // Build workbook
    const wb = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summarySheet, '统计概要');

    const faultSheet = XLSX.utils.json_to_sheet(faultRows);
    XLSX.utils.book_append_sheet(wb, faultSheet, '故障分布');

    const trendSheet = XLSX.utils.json_to_sheet(trendRows);
    XLSX.utils.book_append_sheet(wb, trendSheet, '月度趋势');

    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  /**
   * Generate public maintenance fund application Word document.
   */
  async generateFundWord(id: string): Promise<Buffer> {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id },
      include: {
        elevator: { include: { project: true } },
        costs: true,
        parts: true,
        reporter: { select: { name: true } },
        assignee: { select: { name: true } },
      },
    });
    if (!order) throw new NotFoundException(`报修单 ${id} 不存在`);

    const costTypeLabels: Record<string, string> = {
      FREE: '免费', CONTRACT_IN: '合同内', CONTRACT_OUT: '合同外', PUBLIC_FUND: '公共维修资金',
    };

    const totalCost = order.costs.reduce((sum, c) => sum + Number(c.amount), 0);
    const partsCost = order.parts.reduce((sum, p) => sum + Number(p.price) * p.quantity, 0);

    // Helper to create a simple text-only table row
    const textRow = (cols: string[], bold = false): docx.TableRow =>
      new docx.TableRow({
        children: cols.map(
          (text) =>
            new docx.TableCell({
              children: [new docx.Paragraph({ children: [new docx.TextRun({ text, bold })] })],
            }),
        ),
      });

    // Basic info rows (2-column layout: label | value)
    const infoRows: docx.TableRow[] = [
      { label: '项目名称', value: order.elevator.project?.name || '-' },
      { label: '电梯编号', value: order.elevator.regCode },
      { label: '电梯位置', value: `${order.elevator.building || ''} ${order.elevator.locationDesc || ''}` },
      { label: '报修编号', value: order.orderNo },
      { label: '故障描述', value: order.description },
      { label: '停梯情况', value: order.stopType || '未停梯' },
      { label: '紧急程度', value: order.urgency === 'EMERGENCY' ? '紧急' : order.urgency === 'NORMAL' ? '普通' : '一般' },
      { label: '报修人', value: order.reporter?.name || '-' },
      { label: '维修人', value: order.assignee?.name || '-' },
    ].map(
      ({ label, value }) =>
        new docx.TableRow({
          children: [
            new docx.TableCell({
              width: { size: 2000, type: docx.WidthType.DXA },
              children: [new docx.Paragraph({ children: [new docx.TextRun({ text: label, bold: true })] })],
            }),
            new docx.TableCell({
              width: { size: 9000, type: docx.WidthType.DXA },
              children: [new docx.Paragraph({ children: [new docx.TextRun(value)] })],
            }),
          ],
        }),
    );

    // Cost rows (header + data + total)
    const costRows: docx.TableRow[] = [
      textRow(['费用类型', '金额(元)', '说明'], true),
      ...order.costs.map((c) =>
        textRow([costTypeLabels[c.costType] || c.costType, Number(c.amount).toFixed(2), c.description || '-']),
      ),
      new docx.TableRow({
        children: [
          new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: '合计', bold: true })] })] }),
          new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: totalCost.toFixed(2), bold: true })] })] }),
          new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun('')] })] }),
        ],
      }),
    ];

    // Parts rows (header + data + total)
    const partRows: docx.TableRow[] = [
      textRow(['配件名称', '型号', '数量', '单价(元)', '小计(元)'], true),
      ...order.parts.map((p) =>
        textRow([p.partName, p.partModel || '-', String(p.quantity), Number(p.price).toFixed(2), (Number(p.price) * p.quantity).toFixed(2)]),
      ),
      new docx.TableRow({
        children: [
          new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: '合计', bold: true })] })] }),
          new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun('')] })] }),
          new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun('')] })] }),
          new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun('')] })] }),
          new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: partsCost.toFixed(2), bold: true })] })] }),
        ],
      }),
    ];

    const doc = new docx.Document({
      styles: {
        default: {
          document: {
            run: { font: '仿宋', size: 24 },
            paragraph: { spacing: { line: 360 } },
          },
        },
      },
      sections: [{
        properties: {},
        children: [
          new docx.Paragraph({
            children: [new docx.TextRun({ text: '公共维修资金申报表', bold: true, size: 36, font: '黑体' })],
            alignment: docx.AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new docx.Table({ rows: infoRows }),
          new docx.Paragraph({ spacing: { before: 400 }, children: [new docx.TextRun({ text: '费用明细', bold: true, size: 28, font: '黑体' })] }),
          new docx.Table({ rows: costRows }),
          new docx.Paragraph({ spacing: { before: 400 }, children: [new docx.TextRun({ text: '配件清单', bold: true, size: 28, font: '黑体' })] }),
          new docx.Table({ rows: partRows }),
          new docx.Paragraph({ spacing: { before: 400 }, children: [new docx.TextRun({
            text: `费用总计：¥${(totalCost + partsCost).toFixed(2)}（维修费 ¥${totalCost.toFixed(2)} + 配件费 ¥${partsCost.toFixed(2)}）`,
            bold: true, size: 28,
          })] }),
          new docx.Paragraph({ spacing: { before: 600 }, children: [new docx.TextRun({ text: `申报单位：____________________` })] }),
          new docx.Paragraph({ children: [new docx.TextRun({ text: `申报日期：${new Date().toLocaleDateString('zh-CN')}` })] }),
        ],
      }],
    });

    const buffer = await docx.Packer.toBuffer(doc);
    return Buffer.from(buffer);
  }

  /**
   * Inventory alerts — flag parts whose usage exceeds thresholds.
   * Defaults: past 90 days, minQuantity >= 10 or minUseCount >= 5.
   */
  async getPartsAlerts(params: {
    startDate?: string;
    endDate?: string;
    minQuantity?: number;
    minUseCount?: number;
  }) {
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const startDate = params.startDate || defaultStart.toISOString().slice(0, 10);
    const endDate = params.endDate || now.toISOString().slice(0, 10);
    const minQuantity = params.minQuantity ?? 10;
    const minUseCount = params.minUseCount ?? 5;

    const where: any = {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      },
    };

    const parts = await this.prisma.repairPart.groupBy({
      by: ['partName', 'partModel'],
      where,
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const alerts = parts
      .map((p) => ({
        partName: p.partName,
        partModel: p.partModel,
        totalQuantity: p._sum.quantity || 0,
        useCount: p._count.id,
        avgQuantityPerUse: p._count.id > 0
          ? parseFloat(((p._sum.quantity || 0) / p._count.id).toFixed(1))
          : 0,
        alerts: [] as string[],
      }))
      .filter((p) => {
        let flagged = false;
        if (p.totalQuantity >= minQuantity) {
          p.alerts.push(`使用量(${p.totalQuantity})超过阈值(${minQuantity})`);
          flagged = true;
        }
        if (p.useCount >= minUseCount) {
          p.alerts.push(`使用次数(${p.useCount})超过阈值(${minUseCount}次)`);
          flagged = true;
        }
        return flagged;
      });

    return {
      startDate,
      endDate,
      minQuantity,
      minUseCount,
      totalParts: parts.length,
      alertCount: alerts.length,
      alerts,
    };
  }

  /**
   * Recommend parts based on keyword matching between repair description
   * and contract part names/models. Returns top matches sorted by relevance.
   */
  async getRecommendedParts(repairId: string) {
    const repair = await this.prisma.repairOrder.findUnique({
      where: { id: repairId },
      include: { elevator: true },
    });
    if (!repair) throw new NotFoundException('报修单不存在');

    const description = (repair.description || '').toLowerCase();
    if (!description) return [];

    // Extract keywords from description (split by Chinese/English separators)
    const rawTokens = description
      .split(/[,，、\s；;：:.。!！?？（）()（/）\\[\]【】\-—]+/)
      .filter((t) => t.length >= 1);

    // Get active contracts for this elevator
    const contracts = await this.prisma.contract.findMany({
      where: {
        elevators: { some: { elevatorId: repair.elevatorId } },
        status: 'ACTIVE',
      },
      select: { id: true, name: true },
    });

    if (contracts.length === 0) return [];

    // Get all parts from those contracts
    const parts = await this.prisma.contractPart.findMany({
      where: { contractId: { in: contracts.map((c) => c.id) } },
      select: {
        id: true, name: true, model: true, unit: true, price: true,
        quantity: true, type: true, contractId: true,
      },
    });

    if (parts.length === 0) return [];

    // Score each part by keyword overlap with name and model
    const scored = parts.map((part) => {
      const searchText = `${part.name} ${part.model || ''}`.toLowerCase();
      let score = 0;
      const matchedKeywords: string[] = [];

      for (const token of rawTokens) {
        if (token.length < 2) continue; // skip single chars
        if (searchText.includes(token)) {
          // Higher weight for exact name match vs model match
          const inName = part.name.toLowerCase().includes(token);
          score += inName ? 10 : 3;
          if (!matchedKeywords.includes(token)) matchedKeywords.push(token);
        }
      }

      return { ...part, score, matchedKeywords };
    });

    // Filter and sort
    const recommendations = scored
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ score, matchedKeywords, ...part }) => ({
        ...part,
        relevanceScore: score,
        matchedKeywords,
      }));

    return {
      repairDescription: repair.description,
      contractCount: contracts.length,
      totalParts: parts.length,
      recommendations,
    };
  }
}
