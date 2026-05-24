import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: '新密码' })
  @IsString()
  @MinLength(6, { message: '密码至少6位' })
  password: string;
}
