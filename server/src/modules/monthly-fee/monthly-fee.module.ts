import { Module } from '@nestjs/common';
import { MonthlyFeeController } from './monthly-fee.controller';
import { MonthlyFeeService } from './monthly-fee.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [MonthlyFeeController],
  providers: [MonthlyFeeService, PrismaService],
  exports: [MonthlyFeeService],
})
export class MonthlyFeeModule {}
