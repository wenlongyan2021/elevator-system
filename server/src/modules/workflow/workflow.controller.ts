import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApproveRejectDto } from './dto/approve-reject.dto';
import { AddMaterialDto } from './dto/add-material.dto';

@ApiTags('工作流')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get(':repairOrderId')
  @ApiOperation({ summary: '获取报修单工作流' })
  async getWorkflow(@Param('repairOrderId') repairOrderId: string) {
    return this.workflowService.getWorkflow(repairOrderId);
  }

  @Post(':repairOrderId/approve')
  @ApiOperation({ summary: '审批通过当前步骤' })
  async approve(
    @Param('repairOrderId') repairOrderId: string,
    @Body() dto: ApproveRejectDto,
  ) {
    return this.workflowService.approve(repairOrderId, dto.comment);
  }

  @Post(':repairOrderId/reject')
  @ApiOperation({ summary: '驳回当前步骤' })
  async reject(
    @Param('repairOrderId') repairOrderId: string,
    @Body() dto: ApproveRejectDto,
  ) {
    return this.workflowService.reject(repairOrderId, dto.comment);
  }

  @Post(':repairOrderId/materials')
  @ApiOperation({ summary: '添加维修资金材料' })
  async addMaterial(
    @Param('repairOrderId') repairOrderId: string,
    @Body() dto: AddMaterialDto,
  ) {
    return this.workflowService.addFundMaterial(repairOrderId, dto);
  }

  @Get(':repairOrderId/materials')
  @ApiOperation({ summary: '获取维修资金材料列表' })
  async getMaterials(@Param('repairOrderId') repairOrderId: string) {
    return this.workflowService.getMaterials(repairOrderId);
  }

  @Post(':repairOrderId/generate-material-doc')
  @ApiOperation({ summary: '生成维修资金申报Word文档' })
  async generateMaterialDoc(
    @Param('repairOrderId') repairOrderId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.workflowService.generateFundMaterialDoc(repairOrderId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="fund-material-${repairOrderId.slice(0, 8)}.docx"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
