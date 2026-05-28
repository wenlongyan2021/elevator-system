import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MaintenanceItemController } from './maintenance-item.controller';
import { MaintenanceItemService } from './maintenance-item.service';

@Module({
  controllers: [MaintenanceItemController],
  providers: [PrismaService, MaintenanceItemService],
  exports: [MaintenanceItemService],
})
export class MaintenanceItemModule {}