import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceUnitService } from './maintenance-unit.service';
import { CreateMaintenanceUnitDto } from './dto/create-maintenance-unit.dto';
import { UpdateMaintenanceUnitDto } from './dto/update-maintenance-unit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('维保单位管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('maintenance-units')
export class MaintenanceUnitController {
  constructor(private readonly service: MaintenanceUnitService) {}

  @Post()
  @ApiOperation({ summary: '创建维保单位' })
  create(@Body() dto: CreateMaintenanceUnitDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取维保单位列表' })
  findAll(@Query() query: { page?: number; limit?: number; name?: string }) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取维保单位详情' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新维保单位' })
  update(@Param('id') id: string, @Body() dto: UpdateMaintenanceUnitDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除维保单位' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: '删除成功' };
  }

  @Get(':id/score')
  @ApiOperation({ summary: '获取维保单位评分' })
  getScore(@Param('id') id: string) {
    return this.service.getScore(id);
  }

  @Post('export')
  @ApiOperation({ summary: '导出维保单位列表为Excel' })
  async export(@Query() query: { name?: string }, @Res() res: Response) {
    const buffer = await this.service.exportToExcel(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="maintenance-units-${Date.now()}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Post(':id/recalculate-score')
  @ApiOperation({ summary: '重新计算维保单位评分' })
  recalculateScore(@Param('id') id: string) {
    return this.service.calculateScore(id);
  }
}
