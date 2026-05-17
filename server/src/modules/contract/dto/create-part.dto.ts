import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartType } from '@prisma/client';

export class CreatePartDto {
  @ApiProperty({ description: '配件类型', enum: PartType })
  @IsEnum(PartType)
  @IsNotEmpty()
  type: PartType;

  @ApiProperty({ description: '配件名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '型号' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: '单位', default: '个' })
  @IsOptional()
  @IsString()
  unit?: string = '个';

  @ApiPropertyOptional({ description: '数量', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @ApiPropertyOptional({ description: '单价(仅收费配件)' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}
