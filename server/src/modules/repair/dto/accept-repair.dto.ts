import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptRepairDto {
  @ApiProperty({ description: '接单维保员ID' })
  @IsString()
  assigneeId: string;
}
