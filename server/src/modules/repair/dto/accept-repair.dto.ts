import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptRepairDto {
  @ApiProperty({ description: '分配维保员ID' })
  @IsString()
  assigneeId: string;
}
