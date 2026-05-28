import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MaintenanceRecordService } from './maintenance-record.service';
import { CreateMaintenanceRecordDto } from './dto/maintenance-record.dto';

@ApiTags('维保记录')
@Controller('maintenance-records')
export class MaintenanceRecordController {
  constructor(private readonly service: MaintenanceRecordService) {}

  @Post()
  @ApiOperation({ summary: '提交维保记录' })
  create(@Body() dto: CreateMaintenanceRecordDto) {
    return this.service.create(dto);
  }

  @Get('plan/:planId')
  @ApiOperation({ summary: '获取计划关联的维保记录' })
  findByPlanId(@Param('planId') planId: string) {
    return this.service.findByPlanId(planId);
  }

  @Get('elevator/:elevatorId')
  @ApiOperation({ summary: '获取电梯关联的维保记录' })
  findByElevator(@Param('elevatorId') elevatorId: string) {
    return this.service.findByElevator(elevatorId);
  }
}