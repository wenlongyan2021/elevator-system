import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ElevatorStatus } from '@prisma/client';

export class ElevatorQueryDto {
  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '运行状态', enum: ElevatorStatus })
  @IsOptional()
  @IsEnum(ElevatorStatus)
  status?: ElevatorStatus;

  @ApiPropertyOptional({ description: '楼栋' })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiPropertyOptional({ description: '搜索关键词(编号/楼栋)' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
