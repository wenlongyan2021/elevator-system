import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MaintenanceRecordController } from './maintenance-record.controller';
import { MaintenanceRecordService } from './maintenance-record.service';

@Module({
  controllers: [MaintenanceRecordController],
  providers: [PrismaService, MaintenanceRecordService],
  exports: [MaintenanceRecordService],
})
export class MaintenanceRecordModule {}