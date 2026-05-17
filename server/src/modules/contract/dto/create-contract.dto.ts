import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractStatus } from '@prisma/client';

export class CreateContractDto {
  @ApiProperty({ description: '合同编号' })
  @IsString()
  @IsNotEmpty()
  contractNo: string;

  @ApiProperty({ description: '合同名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '维保单位名称' })
  @IsOptional()
  @IsString()
  maintenanceUnit?: string;

  @ApiPropertyOptional({ description: '维保单位ID' })
  @IsOptional()
  @IsString()
  maintenanceUnitId?: string;

  @ApiProperty({ description: '合同开始日期' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: '合同结束日期' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ description: '台/月单价' })
  @IsNumber()
  monthlyPrice: number;

  @ApiPropertyOptional({ description: '合同总价' })
  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @ApiPropertyOptional({ description: '付款周期', default: 'monthly' })
  @IsOptional()
  @IsString()
  paymentCycle?: string;

  @ApiPropertyOptional({ description: '考核标准(JSON)' })
  @IsOptional()
  @IsString()
  evaluationStd?: string;

  @ApiPropertyOptional({
    description: '合同状态',
    enum: ContractStatus,
    default: ContractStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional({ description: '签约方' })
  @IsOptional()
  @IsString()
  signatory?: string;

  @ApiPropertyOptional({ description: '联系人' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ description: '联系电话' })
  @IsOptional()
  @IsString()
  contactPhone?: string;
}
