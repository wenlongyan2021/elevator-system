import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RepairStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class RepairQueryDto {
  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '电梯ID' })
  @IsOptional()
  @IsString()
  elevatorId?: string;

  @ApiPropertyOptional({ description: '报修状态', enum: RepairStatus })
  @IsOptional()
  @IsEnum(RepairStatus)
  status?: RepairStatus;

  @ApiPropertyOptional({ description: '仅包含有工作流的工单' })
  @IsOptional()
  @Type(() => Boolean)
  hasWorkflow?: boolean;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
