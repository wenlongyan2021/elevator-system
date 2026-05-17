import { IsString, IsOptional, IsInt, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CostType } from '@prisma/client';

export class AddPartDto {
  @ApiProperty({ description: '配件名称' })
  @IsString()
  partName: string;

  @ApiPropertyOptional({ description: '型号' })
  @IsOptional()
  @IsString()
  partModel?: string;

  @ApiPropertyOptional({ description: '数量', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: '单价' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '费用类型', default: 'CONTRACT_IN' })
  @IsOptional()
  @IsEnum(CostType)
  costType?: CostType;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}
