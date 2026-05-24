import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaintenancePlanService } from './maintenance-plan.service';
import { CreateMaintenancePlanDto, BatchCreateMaintenancePlanDto, MaintenancePlanQueryDto, UpdateMaintenancePlanStatusDto } from './dto/maintenance-plan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('维保计划')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('maintenance-plans')
export class MaintenancePlanController {
  constructor(private readonly service: MaintenancePlanService) {}

  @Post()
  @ApiOperation({ summary: '创建维保计划' })
  create(@Body() dto: CreateMaintenancePlanDto) {
    return this.service.create(dto);
  }

  @Post('batch')
  @ApiOperation({ summary: '批量创建维保计划' })
  batchCreate(@Body() dto: BatchCreateMaintenancePlanDto) {
    return this.service.batchCreate(dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Excel导入维保计划' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async import(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请上传文件');
    return this.service.importFromExcel(file);
  }

  @Get()
  @ApiOperation({ summary: '获取维保计划列表' })
  findAll(@Query() query: MaintenancePlanQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取维保计划详情' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新维保计划状态' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateMaintenancePlanStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除维保计划' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: '删除成功' };
  }
}
