import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ArrivedAtDto {
  @ApiPropertyOptional({ description: '到达现场时间（ISO字符串），默认当前时间' })
  @IsOptional()
  @IsString()
  arrivedAt?: string;
}

export class RescueCompletedDto {
  @ApiPropertyOptional({ description: '解救完成时间（ISO字符串），默认当前时间' })
  @IsOptional()
  @IsString()
  rescueCompletedAt?: string;
}