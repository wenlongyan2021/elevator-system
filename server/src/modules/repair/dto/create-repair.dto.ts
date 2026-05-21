import { IsString, IsOptional, IsEnum, IsBoolean, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Urgency } from '@prisma/client';

export class CreateRepairDto {
  @ApiProperty({ description: '电梯ID' })
  @IsString()
  elevatorId: string;

  @ApiPropertyOptional({ description: '报修人ID（可选，默认取当前用户）' })
  @IsOptional()
  @IsString()
  reporterId?: string;

  @ApiPropertyOptional({ description: '停梯/未停梯' })
  @IsOptional()
  @IsString()
  stopType?: string;

  @ApiPropertyOptional({ description: '紧急程度', enum: Urgency, default: 'NORMAL' })
  @IsOptional()
  @IsEnum(Urgency)
  urgency?: Urgency;

  @ApiProperty({ description: '故障描述' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: '是否困人' })
  @IsOptional()
  @IsBoolean()
  isTrapped?: boolean;

  @ApiPropertyOptional({ description: '困人数' })
  @IsOptional()
  @IsInt()
  trappedCount?: number;
}
