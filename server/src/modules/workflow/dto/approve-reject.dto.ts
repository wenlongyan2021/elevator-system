import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveRejectDto {
  @ApiPropertyOptional({ description: '审批意见' })
  @IsOptional()
  @IsString()
  comment?: string;
}
