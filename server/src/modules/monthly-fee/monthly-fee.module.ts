import { Module } from '@nestjs/common';
import { MonthlyFeeController } from './monthly-fee.controller';
import { MonthlyFeeService } from './monthly-fee.service';

@Module({
  controllers: [MonthlyFeeController],
  providers: [MonthlyFeeService],
  exports: [MonthlyFeeService],
})
export class MonthlyFeeModule {}
