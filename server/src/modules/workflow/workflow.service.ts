import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  RepairStatus,
  WorkflowType,
  WorkflowStatus,
} from '@prisma/client';
import { AddMaterialDto } from './dto/add-material.dto';
import { NotificationService } from '../notification/notification.service';

/**
 * Workflow state-machine service for repair orders.
 *
 * Flow:
 *   PENDING_ACCEPT
 *       -> PENDING_REPAIR
 *       -> PENDING_PARTS_VERIFY | PENDING_SUPERVISOR
 *       -> PENDING_SUPERVISOR
 *       -> PENDING_MANAGER
 *       -> PENDING_FUND_REVIEW (if PUBLIC_FUND) | APPROVED
 *       -> PENDING_MANAGER (after fund materials)
 *       -> APPROVED
 *       -> RESOLVED
 *       -> CLOSED
 *
 * On reject at any step the entire workflow transitions to REJECTED.
 */
@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // ---------------------------------------------------------------------------
  // State-transition helpers
  // ---------------------------------------------------------------------------

  /**
   * Given the current RepairStatus and optional flags, return the next status
   * and the associated workflow-type, or `null` if no transition is defined.
   */
  private getNextStep(
    currentStatus: RepairStatus,
    isPartsNeeded?: boolean,
    costType?: string,
  ): { nextStatus: RepairStatus; workflowType: WorkflowType } | null {
    switch (currentStatus) {
      case RepairStatus.PENDING_ACCEPT:
        return {
          nextStatus: RepairStatus.PENDING_REPAIR,
          workflowType: WorkflowType.REPAIR,
        };

      case RepairStatus.PENDING_REPAIR:
        return {
          nextStatus: isPartsNeeded
            ? RepairStatus.PENDING_PARTS_VERIFY
            : RepairStatus.PENDING_SUPERVISOR,
          workflowType: WorkflowType.REPAIR,
        };

      case RepairStatus.PENDING_PARTS_VERIFY:
        return {
          nextStatus: RepairStatus.PENDING_SUPERVISOR,
          workflowType: WorkflowType.REPAIR,
        };

      case RepairStatus.PENDING_SUPERVISOR:
        return {
          nextStatus: RepairStatus.PENDING_MANAGER,
          workflowType: WorkflowType.REPAIR,
        };

      case RepairStatus.PENDING_MANAGER:
        return {
          nextStatus:
            costType === 'PUBLIC_FUND'
              ? RepairStatus.PENDING_FUND_REVIEW
              : RepairStatus.APPROVED,
          workflowType:
            costType === 'PUBLIC_FUND'
              ? WorkflowType.FUND_REPAIR
              : WorkflowType.REPAIR,
        };

      case RepairStatus.PENDING_FUND_REVIEW:
        return {
          nextStatus: RepairStatus.PENDING_MANAGER,
          workflowType: WorkflowType.FUND_REPAIR,
        };

      case RepairStatus.APPROVED:
        return {
          nextStatus: RepairStatus.RESOLVED,
          workflowType: WorkflowType.REPAIR,
        };

      case RepairStatus.RESOLVED:
        return {
          nextStatus: RepairStatus.CLOSED,
          workflowType: WorkflowType.REPAIR,
        };

      default:
        return null;
    }
  }

  /**
   * Internal helper: transition the repair order and its workflow instance
   * to the next logical step. Does NOT create a workflow-node (caller is
   * responsible for that).
   */
  private async advance(repairOrderId: string): Promise<{
    previousStatus: RepairStatus;
    nextStatus: RepairStatus;
    workflowType: WorkflowType;
  }> {
    const repair = await this.prisma.repairOrder.findUnique({
      where: { id: repairOrderId },
      include: {
        parts: true,
        workflow: { include: { materials: true } },
      },
    });

    if (!repair) {
      throw new NotFoundException('报修单不存在');
    }
    if (!repair.workflow) {
      throw new BadRequestException('未找到工作流实例');
    }
    if (repair.workflow.status !== WorkflowStatus.ACTIVE) {
      throw new BadRequestException('工作流已结束，无法继续流转');
    }

    const hasPublicFund = repair.parts.some(
      (p) => p.costType === 'PUBLIC_FUND',
    );
    const next = this.getNextStep(
      repair.status as RepairStatus,
      repair.isPartsNeeded ?? false,
      hasPublicFund ? 'PUBLIC_FUND' : undefined,
    );

    if (!next) {
      throw new BadRequestException(
        `当前状态 ${repair.status} 无法继续流转`,
      );
    }

    // Update repair order status
    const updateData: any = { status: next.nextStatus };
    if (
      next.nextStatus === RepairStatus.RESOLVED ||
      next.nextStatus === RepairStatus.CLOSED
    ) {
      updateData.completedAt = new Date();
    }
    await this.prisma.repairOrder.update({
      where: { id: repairOrderId },
      data: updateData,
    });

    // Update workflow instance
    const wfUpdate: any = { currentStep: next.nextStatus };
    if (next.nextStatus === RepairStatus.CLOSED) {
      wfUpdate.status = WorkflowStatus.COMPLETED;
    }
    await this.prisma.workflowInstance.update({
      where: { id: repair.workflow.id },
      data: wfUpdate,
    });

    // Notify the reporter about the status change
    this.notifyReporter(repairOrderId, next.nextStatus);

    return {
      previousStatus: repair.status as RepairStatus,
      nextStatus: next.nextStatus,
      workflowType: next.workflowType,
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Create a workflow instance for a repair order.
   * Determines the workflow type (FUND_REPAIR if any part uses PUBLIC_FUND).
   */
  async createWorkflow(repairOrderId: string) {
    const repair = await this.prisma.repairOrder.findUnique({
      where: { id: repairOrderId },
      include: { parts: true },
    });

    if (!repair) {
      throw new NotFoundException('报修单不存在');
    }

    const hasPublicFund = repair.parts.some(
      (p) => p.costType === 'PUBLIC_FUND',
    );
    const workflowType = hasPublicFund
      ? WorkflowType.FUND_REPAIR
      : WorkflowType.REPAIR;

    const workflow = await this.prisma.workflowInstance.create({
      data: {
        workflowType,
        repairOrderId,
        currentStep: repair.status,
        status: WorkflowStatus.ACTIVE,
      },
    });

    // Create the initial workflow node recording the submission
    await this.prisma.workflowNode.create({
      data: {
        instanceId: workflow.id,
        stepName: repair.status,
        action: 'SUBMIT',
        comment: '报修单创建，工作流启动',
      },
    });

    return workflow;
  }

  /**
   * Get the full workflow (with history nodes and materials) for a repair order.
   */
  async getWorkflow(repairOrderId: string) {
    const workflow = await this.prisma.workflowInstance.findUnique({
      where: { repairOrderId },
      include: {
        nodes: { orderBy: { createdAt: 'asc' } },
        materials: true,
      },
    });

    if (!workflow) {
      throw new NotFoundException('未找到工作流');
    }
    return workflow;
  }

  /**
   * Approve the current step.
   * Records an APPROVE node and automatically advances to the next step.
   */
  async approve(repairOrderId: string, comment?: string, approverId?: string) {
    const repair = await this.prisma.repairOrder.findUnique({
      where: { id: repairOrderId },
      include: { workflow: true },
    });

    if (!repair) {
      throw new NotFoundException('报修单不存在');
    }
    if (!repair.workflow) {
      throw new BadRequestException('未找到工作流实例');
    }
    if (repair.workflow.status !== WorkflowStatus.ACTIVE) {
      throw new BadRequestException('工作流已结束，无法审批');
    }

    // Record the approval node
    const node = await this.prisma.workflowNode.create({
      data: {
        instanceId: repair.workflow.id,
        stepName: repair.status,
        approverId: approverId || null,
        action: 'APPROVE',
        comment: comment || '审批通过',
      },
    });

    // Advance to the next step
    const transition = await this.advance(repairOrderId);

    return { node, transition };
  }

  /**
   * Reject the current step.
   * Records a REJECT node and transitions the entire workflow to REJECTED.
   */
  async reject(repairOrderId: string, comment?: string, approverId?: string) {
    const repair = await this.prisma.repairOrder.findUnique({
      where: { id: repairOrderId },
      include: { workflow: true },
    });

    if (!repair) {
      throw new NotFoundException('报修单不存在');
    }
    if (!repair.workflow) {
      throw new BadRequestException('未找到工作流实例');
    }
    if (repair.workflow.status !== WorkflowStatus.ACTIVE) {
      throw new BadRequestException('工作流已结束，无法驳回');
    }

    // Record the rejection node
    const node = await this.prisma.workflowNode.create({
      data: {
        instanceId: repair.workflow.id,
        stepName: repair.status,
        approverId: approverId || null,
        action: 'REJECT',
        comment: comment || '已驳回',
      },
    });

    // Update both the repair order and the workflow to REJECTED
    await this.prisma.repairOrder.update({
      where: { id: repairOrderId },
      data: { status: RepairStatus.REJECTED },
    });

    await this.prisma.workflowInstance.update({
      where: { id: repair.workflow.id },
      data: {
        currentStep: RepairStatus.REJECTED,
        status: WorkflowStatus.REJECTED,
      },
    });

    this.notifyReporter(repairOrderId, RepairStatus.REJECTED);

    return node;
  }

  /**
   * Add fund-related materials (announcement, quotation, review_price, photo).
   * If the repair is currently in PENDING_FUND_REVIEW, the workflow is advanced
   * back to PENDING_MANAGER after materials are added.
   */
  async addFundMaterial(repairOrderId: string, dto: AddMaterialDto) {
    const repair = await this.prisma.repairOrder.findUnique({
      where: { id: repairOrderId },
      include: { workflow: true },
    });

    if (!repair) {
      throw new NotFoundException('报修单不存在');
    }
    if (!repair.workflow) {
      throw new BadRequestException('未找到工作流实例');
    }

    const material = await this.prisma.fundMaterial.create({
      data: {
        instanceId: repair.workflow.id,
        materialType: dto.materialType,
        title: dto.title,
        filePath: dto.filePath,
        content: dto.content,
        status: 'SUBMITTED',
      },
    });

    // If currently waiting for fund materials, auto-advance back to PENDING_MANAGER
    if (repair.status === RepairStatus.PENDING_FUND_REVIEW) {
      await this.advance(repairOrderId);
    }

    return material;
  }

  async getMaterials(repairOrderId: string) {
    const repair = await this.prisma.repairOrder.findUnique({
      where: { id: repairOrderId },
      include: { workflow: true },
    });

    if (!repair) {
      throw new NotFoundException('报修单不存在');
    }
    if (!repair.workflow) {
      return [];
    }

    return this.prisma.fundMaterial.findMany({
      where: { instanceId: repair.workflow.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Generate a Word document for 公共维修资金 application materials.
   * Uses the `docx` library to build a structured document with repair order
   * details, part costs, and elevator information.
   */
  async generateFundMaterialDoc(repairOrderId: string) {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } =
      await import('docx');

    const repair = await this.prisma.repairOrder.findUnique({
      where: { id: repairOrderId },
      include: {
        elevator: {
          include: {
            project: { select: { name: true } },
            customerService: { select: { name: true } },
            safetyOfficer: { select: { name: true } },
          },
        },
        parts: true,
        workflow: { include: { materials: true } },
        reporter: { select: { name: true } },
        assignee: { select: { name: true } },
      },
    });

    if (!repair) throw new NotFoundException('报修单不存在');

    const boldLine = (text: string, size = 28) =>
      new Paragraph({
        children: [new TextRun({ text, bold: true, size, font: 'SimSun' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      });

    const fieldRow = (label: string, value: string) =>
      new Paragraph({
        children: [
          new TextRun({ text: `${label}：`, bold: true, size: 24, font: 'SimSun' }),
          new TextRun({ text: value || '-', size: 24, font: 'SimSun' }),
        ],
        spacing: { after: 100 },
      });

    const children: any[] = [
      boldLine('公共维修资金使用申请表'),
      boldLine('', 24),
      fieldRow('报修编号', repair.orderNo),
      fieldRow('电梯注册代码', repair.elevator?.regCode || '-'),
      fieldRow('所在项目', repair.elevator?.project?.name || '-'),
      fieldRow('楼栋位置', repair.elevator?.building || '-'),
      fieldRow('报修人', repair.reporter?.name || '-'),
      fieldRow('维修人员', repair.assignee?.name || '-'),
      fieldRow('紧急程度', { EMERGENCY: '紧急', NORMAL: '普通', LOW: '一般' }[repair.urgency] || repair.urgency),
      fieldRow('停梯情况', repair.stopType === 'STOPPED' ? '已停梯' : '未停梯'),
      fieldRow('故障描述', repair.description || '-'),
      new Paragraph({ spacing: { after: 100 } }),
    ];

    // Parts table
    if (repair.parts.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '配件清单', bold: true, size: 24, font: 'SimSun' })],
          spacing: { after: 100 },
        }),
      );

      const headerRow = new TableRow({
        tableHeader: true,
        children: ['配件名称', '型号', '数量', '单价(元)', '费用类型'].map((h) =>
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: h, bold: true, size: 20, font: 'SimSun' })],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 1200, type: WidthType.DXA },
          }),
        ),
      });

      const dataRows = repair.parts.map((p) =>
        new TableRow({
          children: [p.partName || p.partModel || '-', p.partModel || '-', String(p.quantity ?? 1), String(p.price ?? 0), p.costType || '-'].map((v) =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: v, size: 20, font: 'SimSun' })],
                alignment: AlignmentType.CENTER,
              })],
            }),
          ),
        }),
      );

      children.push(
        new Table({ rows: [headerRow, ...dataRows] }),
        new Paragraph({ spacing: { after: 200 } }),
      );
    }

    // Material history
    if (repair.workflow?.materials?.length) {
      children.push(
        boldLine('已提交材料', 24),
        ...repair.workflow.materials.map((m) =>
          new Paragraph({
            children: [
              new TextRun({ text: `[${m.materialType}] `, bold: true, size: 22, font: 'SimSun' }),
              new TextRun({ text: `${m.title}  (${m.createdAt?.toISOString()?.slice(0, 10) || '-'})`, size: 22, font: 'SimSun' }),
            ],
            spacing: { after: 60 },
          }),
        ),
      );
    }

    children.push(
      new Paragraph({ spacing: { after: 200 } }),
      new Paragraph({
        children: [
          new TextRun({ text: `申请日期：${new Date().toISOString().slice(0, 10)}`, size: 24, font: 'SimSun' }),
        ],
        alignment: AlignmentType.RIGHT,
      }),
    );

    const doc = new Document({
      sections: [{
        properties: {},
        children,
      }],
    });

    return Packer.toBuffer(doc);
  }

  private statusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING_REVIEW: '待审核', PENDING_ACCEPT: '待接单',
      PENDING_REPAIR: '维修中', PENDING_PARTS_VERIFY: '待配件确认',
      PENDING_SUPERVISOR: '待主管审批', PENDING_MANAGER: '待经理审批',
      PENDING_FUND_REVIEW: '待补充资金材料', APPROVED: '已批准',
      RESOLVED: '已修复', CLOSED: '已完结', REJECTED: '已驳回',
    };
    return map[status] || status;
  }

  private async notifyReporter(repairOrderId: string, status: string) {
    try {
      const repair = await this.prisma.repairOrder.findUnique({
        where: { id: repairOrderId },
        select: { reporterId: true, orderNo: true },
      });
      if (!repair?.reporterId) return;

      await this.notificationService.createNotification({
        userId: repair.reporterId,
        title: `报修单 ${repair.orderNo || ''} 状态更新`,
        content: `您的报修单状态已更新为：${this.statusLabel(status)}`,
        type: 'REPAIR',
        refId: repairOrderId,
      });
    } catch (err) {
      this.logger.warn(`通知发送失败: ${(err as Error).message}`);
    }
  }
}
