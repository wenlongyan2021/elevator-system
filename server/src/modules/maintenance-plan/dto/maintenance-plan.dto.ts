import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMaintenancePlanDto {
  @ApiProperty({ description: '电梯ID' })
  @IsString()
  @IsNotEmpty()
  elevatorId: string;

  @ApiProperty({ description: '计划日期' })
  @IsDateString()
  planDate: string;

  @ApiProperty({ description: '计划类型', enum: ['HALF_MONTHLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'] })
  @IsString()
  @IsNotEmpty()
  planType: string;

  @ApiProperty({ description: '维保员ID' })
  @IsString()
  @IsNotEmpty()
  maintainerId: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class MaintenancePlanQueryDto {
  @IsOptional()
  @IsString()
  elevatorId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  maintainerId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
