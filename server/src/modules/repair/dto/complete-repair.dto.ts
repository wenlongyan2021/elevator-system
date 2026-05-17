import { IsOptional, IsString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AddPartDto } from './add-part.dto';

export class CompleteRepairDto {
  @ApiPropertyOptional({ description: '是否需要更换配件' })
  @IsOptional()
  @IsBoolean()
  isPartsNeeded?: boolean;

  @ApiPropertyOptional({ description: '修复说明' })
  @IsOptional()
  @IsString()
  resolveNote?: string;

  @ApiPropertyOptional({ description: '配件列表', type: [AddPartDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddPartDto)
  parts?: AddPartDto[];
}
