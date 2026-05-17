import { Module } from '@nestjs/common';
import { MaintenancePlanController } from './maintenance-plan.controller';
import { MaintenancePlanService } from './maintenance-plan.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [MaintenancePlanController],
  providers: [MaintenancePlanService, PrismaService],
  exports: [MaintenancePlanService],
})
export class MaintenancePlanModule {}
