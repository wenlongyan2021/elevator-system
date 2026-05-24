import { IsString, IsNotEmpty, IsOptional, IsDateString, IsInt, Min, IsArray, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
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

  @ApiProperty({ description: '维保员ID数组（至少2人）', type: [String] })
  @IsArray()
  @ArrayMinSize(2, { message: '请至少选择2名维保员' })
  maintainerIds: string[];

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class BatchCreateMaintenancePlanDto {
  @ApiProperty({ description: '电梯ID数组' })
  @IsArray()
  @IsNotEmpty()
  elevatorIds: string[];

  @ApiProperty({ description: '计划日期' })
  @IsDateString()
  planDate: string;

  @ApiProperty({ description: '计划类型', enum: ['HALF_MONTHLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'] })
  @IsString()
  @IsNotEmpty()
  planType: string;

  @ApiProperty({ description: '维保员ID数组（至少2人）', type: [String] })
  @IsArray()
  @ArrayMinSize(2, { message: '请至少选择2名维保员' })
  maintainerIds: string[];

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class BatchCreatePlanResponseDto {
  created: number;
  plans: any[];
  duplicates?: { elevatorId: string; reason: string }[];
}

export class UpdateMaintenancePlanStatusDto {
  @ApiProperty({ description: '状态' })
  @IsString()
  @IsNotEmpty()
  status: string;
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
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
