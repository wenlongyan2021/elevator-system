import { Module } from '@nestjs/common';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { NotificationModule } from '../notification/notification.module';
import { MonthlyFeeModule } from '../monthly-fee/monthly-fee.module';

@Module({
  imports: [NotificationModule, MonthlyFeeModule],
  providers: [ScheduledTasksService],
})
export class ScheduledTasksModule {}
