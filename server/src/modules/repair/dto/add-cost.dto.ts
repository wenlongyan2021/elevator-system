import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CostType } from '@prisma/client';

export class AddCostDto {
  @ApiProperty({ description: '费用类型', enum: CostType })
  @IsEnum(CostType)
  costType: CostType;

  @ApiProperty({ description: '金额' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: '费用说明' })
  @IsOptional()
  @IsString()
  description?: string;
}
