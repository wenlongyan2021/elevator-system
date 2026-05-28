import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { ElevatorModule } from './modules/elevator/elevator.module';
import { ContractModule } from './modules/contract/contract.module';
import { RepairModule } from './modules/repair/repair.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { QRCodeModule } from './modules/qrcode/qrcode.module';
import { InspectionModule } from './modules/inspection/inspection.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FileModule } from './modules/file/file.module';
import { NotificationModule } from './modules/notification/notification.module';
import { MaintenanceUnitModule } from './modules/maintenance-unit/maintenance-unit.module';
import { MonthlyFeeModule } from './modules/monthly-fee/monthly-fee.module';
import { MaintenancePlanModule } from './modules/maintenance-plan/maintenance-plan.module';
import { MaintenanceItemModule } from './modules/maintenance-item/maintenance-item.module';
import { MaintenanceRecordModule } from './modules/maintenance-record/maintenance-record.module';
import { ScheduledTasksModule } from './modules/scheduled-tasks/scheduled-tasks.module';
import { CacheModule } from './modules/cache/cache.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    OrganizationModule,
    ElevatorModule,
    ContractModule,
    RepairModule,
    WorkflowModule,
    QRCodeModule,
    InspectionModule,
    DashboardModule,
    FileModule,
    NotificationModule,
    MaintenanceUnitModule,
    MonthlyFeeModule,
    MaintenancePlanModule,
    MaintenanceItemModule,
    MaintenanceRecordModule,
    ScheduledTasksModule,
    CacheModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
