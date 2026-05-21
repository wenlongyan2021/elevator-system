import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

class RepairTrendQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  months?: number;
}

class FaultDistributionQueryDto {
  @IsOptional()
  @IsString()
  projectId?: string;
}

@ApiTags('看板统计')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: '概览统计' })
  async overview() {
    return this.dashboardService.getOverview();
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: '项目电梯统计' })
  async projectStats(@Param('projectId') projectId: string) {
    return this.dashboardService.getProjectStats(projectId);
  }

  @Get('repair-trend')
  @ApiOperation({ summary: '维修趋势' })
  async repairTrend(@Query() query: RepairTrendQueryDto) {
    const months = query.months ?? 6;
    return this.dashboardService.getRepairTrend(months);
  }

  @Get('fault-distribution')
  @ApiOperation({ summary: '故障分布' })
  async faultDistribution(@Query() query: FaultDistributionQueryDto) {
    return this.dashboardService.getFaultDistribution(query.projectId);
  }

  @Get('repair-stats')
  @ApiOperation({ summary: '维修统计（紧急度、完成率）' })
  async repairStats() {
    return this.dashboardService.getRepairStats();
  }

  @Get('unplanned-maintenance')
  @ApiOperation({ summary: '未按计划维保记录' })
  async unplannedMaintenance() {
    return this.dashboardService.getUnplannedMaintenance();
  }

  @Get('maintenance-duration-stats')
  @ApiOperation({ summary: '维保时长统计' })
  async maintenanceDurationStats() {
    return this.dashboardService.getMaintenanceDurationStats();
  }

  @Get('repair-duration-stats')
  @ApiOperation({ summary: '维修时长统计' })
  async repairDurationStats() {
    return this.dashboardService.getRepairDurationStats();
  }
}
