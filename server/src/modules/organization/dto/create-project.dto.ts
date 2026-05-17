import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ description: '项目/小区名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '所属集团ID' })
  @IsString()
  organizationId: string;

  @ApiPropertyOptional({ description: '地址' })
  @IsOptional()
  @IsString()
  address?: string;
}
