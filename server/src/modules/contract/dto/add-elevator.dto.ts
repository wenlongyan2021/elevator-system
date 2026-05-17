import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddElevatorDto {
  @ApiProperty({ description: '电梯ID列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  elevatorIds: string[];

  @ApiPropertyOptional({ description: '开始日期' })
  @IsOptional()
  @IsDateString()
  startDate?: string;
}
