import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddMaterialDto {
  @ApiProperty({
    description: '材料类型',
    enum: ['ANNOUNCEMENT', 'QUOTATION', 'REVIEW_PRICE', 'PHOTO'],
  })
  @IsEnum(['ANNOUNCEMENT', 'QUOTATION', 'REVIEW_PRICE', 'PHOTO'] as const)
  materialType: string;

  @ApiProperty({ description: '标题' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '文件路径' })
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiPropertyOptional({ description: '内容（模板生成）' })
  @IsOptional()
  @IsString()
  content?: string;
}
