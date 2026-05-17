import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WechatLoginDto {
  @ApiProperty({ description: '微信登录code' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: '用户信息' })
  @IsOptional()
  userInfo?: { name?: string; avatar?: string };
}
