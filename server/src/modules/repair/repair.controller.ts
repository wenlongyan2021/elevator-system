import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { RepairService } from './repair.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateRepairDto } from './dto/create-repair.dto';
import { RepairQueryDto } from './dto/repair-query.dto';
import { AcceptRepairDto } from './dto/accept-repair.dto';
import { CompleteRepairDto } from './dto/complete-repair.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AddPartDto } from './dto/add-part.dto';
import { AddCostDto } from './dto/add-cost.dto';

@ApiTags('报修管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('repairs')
export class RepairController {
  constructor(private readonly repairService: RepairService) {}

  @Post()
  @ApiOperation({ summary: '创建报修单' })
  async create(@Body() dto: CreateRepairDto, @CurrentUser() user: any) {
    if (!dto.reporterId && user?.id) {
      dto.reporterId = user.id;
    }
    return this.repairService.createRepair(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取报修单列表' })
  async findAll(@Query() query: RepairQueryDto) {
    return this.repairService.findRepairs(query);
  }

  @Get('maintainers')
  @ApiOperation({ summary: '获取维保人员列表' })
  async getMaintainers() {
    return this.repairService.getMaintainers();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取报修单详情' })
  async findOne(@Param('id') id: string) {
    return this.repairService.findRepairById(id);
  }

  @Put(':id/accept')
  @ApiOperation({ summary: '分配维修人员' })
  async accept(@Param('id') id: string, @Body() dto: AcceptRepairDto) {
    return this.repairService.acceptRepair(id, dto.assigneeId);
  }

  @Put(':id/repair')
  @ApiOperation({ summary: '提交维修结果' })
  async complete(@Param('id') id: string, @Body() dto: CompleteRepairDto) {
    return this.repairService.completeRepair(id, dto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新报修单状态' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.repairService.updateStatus(id, dto.status);
  }

  @Post(':id/media')
  @ApiOperation({ summary: '上传媒体文件（图片/视频）' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }
    return this.repairService.uploadMedia(id, file);
  }

  @Get(':id/media')
  @ApiOperation({ summary: '获取媒体文件列表' })
  async findMedia(@Param('id') id: string) {
    return this.repairService.findMedia(id);
  }

  @Post(':id/parts')
  @ApiOperation({ summary: '添加配件信息' })
  async addPart(@Param('id') id: string, @Body() dto: AddPartDto) {
    return this.repairService.addPart(id, dto);
  }

  @Get(':id/parts')
  @ApiOperation({ summary: '获取配件列表' })
  async findParts(@Param('id') id: string) {
    return this.repairService.findParts(id);
  }

  @Get(':id/costs')
  @ApiOperation({ summary: '获取费用列表' })
  async findCosts(@Param('id') id: string) {
    return this.repairService.findCosts(id);
  }

  @Post(':id/costs')
  @ApiOperation({ summary: '添加费用' })
  async addCost(@Param('id') id: string, @Body() dto: AddCostDto) {
    return this.repairService.addCost(id, dto);
  }

  @Put(':id/costs/:costId')
  @ApiOperation({ summary: '更新费用' })
  async updateCost(
    @Param('id') id: string,
    @Param('costId') costId: string,
    @Body() dto: AddCostDto,
  ) {
    return this.repairService.updateCost(id, costId, dto);
  }

  @Delete(':id/costs/:costId')
  @ApiOperation({ summary: '删除费用' })
  async deleteCost(
    @Param('id') id: string,
    @Param('costId') costId: string,
  ) {
    await this.repairService.deleteCost(id, costId);
    return { message: '删除成功' };
  }

  @Get('parts-stats')
  @ApiOperation({ summary: '配件使用统计' })
  async getPartsStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.repairService.getPartsStats(startDate, endDate);
  }

  @Get('parts-alerts')
  @ApiOperation({ summary: '配件库存预警 — 用量超过阈值的配件' })
  async getPartsAlerts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minQuantity') minQuantity?: string,
    @Query('minUseCount') minUseCount?: string,
  ) {
    return this.repairService.getPartsAlerts({
      startDate,
      endDate,
      minQuantity: minQuantity ? parseInt(minQuantity, 10) : undefined,
      minUseCount: minUseCount ? parseInt(minUseCount, 10) : undefined,
    });
  }

  @Get('report/export')
  @ApiOperation({ summary: '导出维修统计报表Excel' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  async exportReport(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.repairService.generateReportExcel(
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
    res!.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="repair-report-${Date.now()}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res!.send(buffer);
  }

  @Get(':id/recommended-parts')
  @ApiOperation({ summary: '智能推荐配件(基于故障描述关键词匹配)' })
  async getRecommendedParts(@Param('id') id: string) {
    return this.repairService.getRecommendedParts(id);
  }

  @Get(':id/fund-word')
  @ApiOperation({ summary: '生成公共维修资金申报Word文档' })
  async generateFundWord(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.repairService.generateFundWord(id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="fund-application-${id.slice(0, 8)}.docx"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
