import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMaintenanceRecordItemDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  checkResult: string; // OK / NG / NA

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreateMaintenanceRecordDto {
  @ApiProperty({ description: '维保计划ID' })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({ description: '电梯ID' })
  @IsString()
  @IsNotEmpty()
  elevatorId: string;

  @ApiProperty({ description: '计划类型' })
  @IsString()
  @IsNotEmpty()
  planType: string;

  @ApiProperty({ description: '维保员ID数组' })
  @IsArray()
  maintainerIds: string[];

  @ApiPropertyOptional({ description: '开始时间' })
  @IsOptional()
  @IsString()
  startedAt?: string;

  @ApiPropertyOptional({ description: '维保小结' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: '异常情况' })
  @IsOptional()
  @IsString()
  abnormalSituations?: string;

  @ApiPropertyOptional({ description: '执行人ID' })
  @IsOptional()
  @IsString()
  operatorId?: string;

  @ApiProperty({ description: '保养项目检查结果', type: [CreateMaintenanceRecordItemDto] })
  @IsArray()
  items: CreateMaintenanceRecordItemDto[];
}