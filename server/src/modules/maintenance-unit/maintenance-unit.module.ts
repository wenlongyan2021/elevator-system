import { Module } from '@nestjs/common';
import { MaintenanceUnitController } from './maintenance-unit.controller';
import { MaintenanceUnitService } from './maintenance-unit.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [MaintenanceUnitController],
  providers: [MaintenanceUnitService, PrismaService],
  exports: [MaintenanceUnitService],
})
export class MaintenanceUnitModule {}
