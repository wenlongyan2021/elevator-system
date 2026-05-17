import { Module } from '@nestjs/common';
import { RepairController } from './repair.controller';
import { RepairService } from './repair.service';
import { NotificationModule } from '../notification/notification.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [NotificationModule, WorkflowModule],
  controllers: [RepairController],
  providers: [RepairService],
  exports: [RepairService],
})
export class RepairModule {}
