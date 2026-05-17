import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEvaluationDto {
  @ApiProperty({ description: '考核月份' })
  @IsDateString()
  @IsNotEmpty()
  month: string;

  @ApiProperty({ description: '分值(0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  score: number;

  @ApiPropertyOptional({ description: '考核内容' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '考核人' })
  @IsOptional()
  @IsString()
  evaluator?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}
