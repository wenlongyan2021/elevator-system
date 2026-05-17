import { PartialType } from '@nestjs/swagger';
import { CreateMaintenanceUnitDto } from './create-maintenance-unit.dto';

export class UpdateMaintenanceUnitDto extends PartialType(CreateMaintenanceUnitDto) {}
