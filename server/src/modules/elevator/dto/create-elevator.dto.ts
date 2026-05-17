import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ElevatorStatus } from '@prisma/client';

export class CreateElevatorDto {
  @ApiProperty({ description: '注册代码/设备代码' })
  @IsString()
  @IsNotEmpty()
  regCode: string;

  @ApiPropertyOptional({ description: '资产编号' })
  @IsOptional()
  @IsString()
  assetNo?: string;

  @ApiPropertyOptional({ description: '品牌' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: '型号' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: '层站数' })
  @IsOptional()
  @IsNumber()
  floorCount?: number;

  @ApiPropertyOptional({ description: '载重(kg)' })
  @IsOptional()
  @IsNumber()
  capacity?: number;

  @ApiPropertyOptional({ description: '速度(m/s)' })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({ description: '安装日期' })
  @IsOptional()
  @IsDateString()
  installDate?: string;

  @ApiPropertyOptional({ description: '最近年检日期' })
  @IsOptional()
  @IsDateString()
  lastInspectDate?: string;

  @ApiPropertyOptional({ description: '下次年检日期' })
  @IsOptional()
  @IsDateString()
  nextInspectDate?: string;

  @ApiPropertyOptional({ description: '出厂编号' })
  @IsOptional()
  @IsString()
  manufactureNo?: string;

  @ApiPropertyOptional({ description: '运行状态', enum: ElevatorStatus, default: ElevatorStatus.RUNNING })
  @IsOptional()
  @IsEnum(ElevatorStatus)
  status?: ElevatorStatus;

  @ApiPropertyOptional({ description: '位置描述' })
  @IsOptional()
  @IsString()
  locationDesc?: string;

  @ApiPropertyOptional({ description: 'GPS纬度' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'GPS经度' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ description: '所属项目ID' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiPropertyOptional({ description: '楼栋' })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiPropertyOptional({ description: '客户服务人员ID' })
  @IsOptional()
  @IsString()
  customerServiceId?: string;

  @ApiPropertyOptional({ description: '安全员ID' })
  @IsOptional()
  @IsString()
  safetyOfficerId?: string;

  @ApiPropertyOptional({ description: '安全总监ID' })
  @IsOptional()
  @IsString()
  safetyDirectorId?: string;

  @ApiPropertyOptional({ description: '维保人员ID' })
  @IsOptional()
  @IsString()
  maintainerId?: string;
}
