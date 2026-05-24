import { IsString, IsOptional, IsEnum, IsArray, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ description: '姓名' })
  @IsString()
  name: string;

  @ApiProperty({ description: '手机号' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: '账号（用于登录，默认使用手机号）' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: '密码（默认 123456）' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ description: '角色', enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ description: '直属上级ID' })
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiPropertyOptional({ description: '维保单位ID' })
  @IsOptional()
  @IsString()
  maintenanceUnitId?: string;

  @ApiPropertyOptional({ description: '关联项目ID列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectIds?: string[];
}
