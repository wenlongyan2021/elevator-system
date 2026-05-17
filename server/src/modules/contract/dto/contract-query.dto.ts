import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ContractStatus } from '@prisma/client';

export class ContractQueryDto {
  @ApiPropertyOptional({ description: '维保单位ID' })
  @IsOptional()
  @IsString()
  maintenanceUnitId?: string;

  @ApiPropertyOptional({ description: '合同状态', enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional({ description: '电梯ID' })
  @IsOptional()
  @IsString()
  elevatorId?: string;

  @ApiPropertyOptional({ description: '搜索关键词(合同名称/编号)' })
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
