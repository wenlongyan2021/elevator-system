import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MaintenanceItemService } from './maintenance-item.service';

@ApiTags('维保项目清单')
@Controller('maintenance-items')
export class MaintenanceItemController {
  constructor(private readonly service: MaintenanceItemService) {}

  @Get('plan-type/:planType')
  @ApiOperation({ summary: '获取指定保养类型的项目清单' })
  findByPlanType(@Param('planType') planType: string) {
    return this.service.findByPlanType(planType);
  }

  @Get('grouped/:planType')
  @ApiOperation({ summary: '获取保养项目（按分类分组）' })
  findGroupedByCategory(@Param('planType') planType: string) {
    return this.service.findGroupedByCategory(planType);
  }

  @Get('summary')
  @ApiOperation({ summary: '获取各保养类型项目数量统计' })
  getPlanTypeSummary() {
    return this.service.getPlanTypeSummary();
  }
}