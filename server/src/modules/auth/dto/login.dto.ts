import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: '账号', example: 'admin' })
  @IsString()
  account: string;

  @ApiProperty({ description: '密码', example: 'admin123' })
  @IsString()
  password: string;
}
