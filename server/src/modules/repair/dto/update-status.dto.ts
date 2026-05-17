import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RepairStatus } from '@prisma/client';

export class UpdateStatusDto {
  @ApiProperty({ description: '新状态', enum: RepairStatus })
  @IsEnum(RepairStatus)
  status: RepairStatus;
}
