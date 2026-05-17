import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InspectionService } from './inspection.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InspectionType } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class CreateInspectionDto {
  @IsString()
  elevatorId: string;

  @IsString()
  inspectorId: string;

  @IsEnum(InspectionType)
  type: InspectionType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

class AddPhotoDto {
  @IsString()
  filePath: string;

  @IsOptional()
  @IsString()
  watermarkPath?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;
}

class ListInspectionQueryDto {
  @IsOptional()
  @IsString()
  elevatorId?: string;

  @IsOptional()
  @IsString()
  inspectorId?: string;

  @IsOptional()
  @IsEnum(InspectionType)
  type?: InspectionType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

@ApiTags('巡查维保')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inspections')
export class InspectionController {
  constructor(private readonly inspectionService: InspectionService) {}

  @Post()
  @ApiOperation({ summary: '创建巡检任务' })
  async create(@Body() dto: CreateInspectionDto) {
    return this.inspectionService.createTask(dto);
  }

  @Post(':id/photos')
  @ApiOperation({ summary: '添加巡检照片' })
  async addPhoto(@Param('id') id: string, @Body() dto: AddPhotoDto) {
    return this.inspectionService.addPhoto(id, dto);
  }

  @Get()
  @ApiOperation({ summary: '巡检任务列表' })
  async list(@Query() query: ListInspectionQueryDto) {
    return this.inspectionService.getTasks({
      elevatorId: query.elevatorId,
      inspectorId: query.inspectorId,
      type: query.type,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      limit: query.limit,
    });
  }

  @Post('export')
  @ApiOperation({ summary: '导出巡检记录为Excel' })
  async export(@Query() query: ListInspectionQueryDto, @Res() res: Response) {
    const buffer = await this.inspectionService.exportToExcel(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="inspections-${Date.now()}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: '巡检任务详情' })
  async detail(@Param('id') id: string) {
    return this.inspectionService.getTaskDetail(id);
  }
}
