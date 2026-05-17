import { IsString, IsOptional, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: '手机号', example: '13800000000' })
  @IsString()
  phone: string;

  @ApiProperty({ description: '密码', example: 'admin123' })
  @IsString()
  password: string;
}

export class WechatLoginDto {
  @ApiProperty({ description: '微信登录code' })
  @IsString()
  code: string;

  @ApiProperty({ description: '用户信息', required: false })
  @IsOptional()
  userInfo?: { name?: string; avatar?: string };
}
