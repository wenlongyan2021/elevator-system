import { IsString, IsOptional, IsInt, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class MonthlyFeeQueryDto {
  @IsOptional()
  @IsString()
  maintenanceUnitId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  yearMonth?: string;

  @IsOptional()
  @IsString()
  status?: string;

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

export class GenerateFeeDto {
  @IsOptional()
  @IsString()
  maintenanceUnitId?: string;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  month?: number;
}

export class UpdateMonthlyFeeStatusDto {
  @ApiProperty({ description: '状态' })
  @IsString()
  @IsNotEmpty()
  status: string;
}
